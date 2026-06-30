"""Lead Score determinístico (0–100), em Python puro e auditável.

Peso forte no combo "negócio consolidado + sem site / site ruim" — o lead mais
valioso pro negócio. O agente pode interpretar o resultado, mas não alterá-lo.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import PipelineState, ScoreBand, SiteClass
from app.models.audit import SiteAudit
from app.models.config import Category
from app.models.pipeline import LeadPipeline, LeadScore, LeadScoreComponent
from app.models.places import Place

SKIP_STATES = [PipelineState.DISQUALIFIED, PipelineState.LOST]

# Oportunidade de venda por status do site (peso máximo = 40)
SITE_POINTS: dict[SiteClass, int] = {
    SiteClass.SEM_SITE: 40,
    SiteClass.REDE_SOCIAL: 38,
    SiteClass.FORA_DO_AR: 36,
    SiteClass.SITE_OBSOLETO: 32,
    SiteClass.SITE_FRACO: 22,
    SiteClass.SITE_RAZOAVEL: 10,
    SiteClass.SITE_BOM: 2,
}


def reviews_points(n: int | None) -> int:  # máx 20
    n = n or 0
    if n >= 200:
        return 20
    if n >= 100:
        return 17
    if n >= 50:
        return 14
    if n >= 20:
        return 10
    if n >= 10:
        return 6
    if n >= 1:
        return 2
    return 0


def rating_points(r: float | None) -> int:  # máx 15
    if r is None:
        return 0
    if r >= 4.7:
        return 15
    if r >= 4.3:
        return 12
    if r >= 4.0:
        return 9
    if r >= 3.5:
        return 6
    return 2


def contact_points(place: Place) -> int:  # máx 10
    return (6 if place.phone else 0) + (4 if place.instagram_handle else 0)


def segment_points(session: Session, category: str | None) -> int:  # máx 15
    if not category:
        return 9  # neutro quando categoria desconhecida
    cat = session.scalar(select(Category).where(Category.name == category))
    priority = cat.priority if cat else 60
    return round(priority / 100 * 15)


def band_for(score: int) -> ScoreBand:
    if score >= 85:
        return ScoreBand.PRIORIDADE
    if score >= 70:
        return ScoreBand.ALTO_POTENCIAL
    if score >= 60:
        return ScoreBand.REVISAR
    if score >= 40:
        return ScoreBand.BAIXO_POTENCIAL
    return ScoreBand.DESCARTAR


def _latest_site_class(session: Session, place_id: str) -> SiteClass | None:
    return session.scalar(
        select(SiteAudit.site_class)
        .where(SiteAudit.place_id == place_id)
        .order_by(SiteAudit.id.desc())
    )


def compute(session: Session, place: Place) -> tuple[int, ScoreBand, list[tuple[str, int, int]]]:
    site_class = _latest_site_class(session, place.place_id)
    components = [
        ("site_oportunidade", 40, SITE_POINTS.get(site_class, 0)),
        ("reviews", 20, reviews_points(place.reviews_count)),
        ("nota", 15, rating_points(place.rating)),
        ("contato", 10, contact_points(place)),
        ("segmento", 15, segment_points(session, place.category)),
    ]
    total = sum(value for _, _, value in components)
    return total, band_for(total), components


def score_place(session: Session, place: Place) -> LeadScore:
    total, band, components = compute(session, place)

    score = LeadScore(
        place_id=place.place_id,
        score=total,
        band=band,
        calculated_at=datetime.now(timezone.utc),
    )
    session.add(score)
    session.flush()
    for name, weight, value in components:
        session.add(
            LeadScoreComponent(score_id=score.id, component=name, weight=weight, value=value)
        )

    pipeline = session.scalar(
        select(LeadPipeline).where(LeadPipeline.place_id == place.place_id)
    )
    if pipeline is None:
        pipeline = LeadPipeline(place_id=place.place_id)
        session.add(pipeline)
    pipeline.state = PipelineState.SCORED

    session.commit()
    session.refresh(score)
    return score


def score_pending(session: Session, *, limit: int = 100) -> list[LeadScore]:
    scored_ids = select(LeadScore.place_id)
    stmt = (
        select(Place)
        .join(LeadPipeline, LeadPipeline.place_id == Place.place_id)
        .where(~LeadPipeline.state.in_(SKIP_STATES))
        .where(Place.place_id.not_in(scored_ids))
        .limit(limit)
    )
    places = list(session.scalars(stmt))
    return [score_place(session, p) for p in places]
