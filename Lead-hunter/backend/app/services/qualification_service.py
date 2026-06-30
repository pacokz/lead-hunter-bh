"""Filtro de qualificação: aplica nota/reviews/categoria e avança o pipeline."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.enums import PipelineState
from app.models.config import QualificationRule
from app.models.pipeline import LeadPipeline
from app.models.places import Place


def qualify_place(
    session: Session,
    place: Place,
    rule: QualificationRule | None = None,
) -> tuple[PipelineState, list[str]]:
    min_rating = rule.min_rating if rule else settings.min_rating
    min_reviews = rule.min_reviews if rule else settings.min_reviews
    excluded = (rule.excluded_categories if rule and rule.excluded_categories else []) or []

    reasons: list[str] = []
    if place.business_status and place.business_status != "OPERATIONAL":
        reasons.append("não operacional")
    if (place.rating or 0) < min_rating:
        reasons.append(f"nota < {min_rating}")
    if (place.reviews_count or 0) < min_reviews:
        reasons.append(f"reviews < {min_reviews}")
    if place.category and place.category in excluded:
        reasons.append("categoria excluída")

    state = PipelineState.DISQUALIFIED if reasons else PipelineState.QUALIFIED

    pipeline = session.scalar(
        select(LeadPipeline).where(LeadPipeline.place_id == place.place_id)
    )
    if pipeline is None:
        pipeline = LeadPipeline(place_id=place.place_id)
        session.add(pipeline)
    pipeline.state = state
    session.commit()
    return state, reasons
