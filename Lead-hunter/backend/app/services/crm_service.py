"""CRM: promove leads quentes ao pipeline comercial e move entre estágios (Kanban)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import CommercialStage, ScoreBand
from app.models.crm import CommercialPipeline
from app.models.pipeline import LeadScore
from app.models.places import Place

PROMOTE_BANDS = [ScoreBand.PRIORIDADE, ScoreBand.ALTO_POTENCIAL]


def get_or_create(session: Session, place_id: str) -> CommercialPipeline:
    cp = session.scalar(
        select(CommercialPipeline).where(CommercialPipeline.place_id == place_id)
    )
    if cp is None:
        cp = CommercialPipeline(place_id=place_id, stage=CommercialStage.NOVO)
        session.add(cp)
        session.commit()
        session.refresh(cp)
    return cp


def move_stage(session: Session, place_id: str, stage: CommercialStage) -> CommercialPipeline:
    cp = get_or_create(session, place_id)
    cp.stage = stage
    session.commit()
    session.refresh(cp)
    return cp


def promote_qualified(session: Session, *, limit: int = 100) -> list[str]:
    """Cria card NOVO no CRM para leads ALTO_POTENCIAL/PRIORIDADE ainda fora do CRM."""
    existing = select(CommercialPipeline.place_id)
    stmt = (
        select(Place.place_id)
        .join(LeadScore, LeadScore.place_id == Place.place_id)
        .where(LeadScore.band.in_(PROMOTE_BANDS))
        .where(Place.place_id.not_in(existing))
        .limit(limit)
    )
    ids = list(session.scalars(stmt))
    for pid in ids:
        session.add(CommercialPipeline(place_id=pid, stage=CommercialStage.NOVO))
    session.commit()
    return ids
