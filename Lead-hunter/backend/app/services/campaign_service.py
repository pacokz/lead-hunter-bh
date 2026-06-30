"""Criação de campanhas e geração de search_jobs (termo × região × página)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.places import SearchCampaign, SearchJob


def create_campaign(
    session: Session,
    *,
    name: str,
    category: str | None = None,
    terms: list[str] | None = None,
    regions: list[str] | None = None,
    min_rating: float | None = None,
    min_reviews: int | None = None,
    max_pages: int = 1,
    max_calls: int | None = None,
) -> SearchCampaign:
    campaign = SearchCampaign(
        name=name,
        category=category,
        terms=terms or [],
        regions=regions or [],
        min_rating=min_rating,
        min_reviews=min_reviews,
        max_pages=max_pages,
        max_calls=max_calls,
    )
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


def generate_jobs(session: Session, campaign: SearchCampaign) -> list[SearchJob]:
    """Gera um job de página 1 para cada combinação termo × região.

    Páginas seguintes são criadas em runtime, ao executar o job, usando o
    nextPageToken — respeitando o limite `max_pages` da campanha.
    """
    jobs: list[SearchJob] = []
    for term in campaign.terms or []:
        for region in campaign.regions or []:
            job = SearchJob(campaign_id=campaign.id, term=term, region=region, page=1)
            session.add(job)
            jobs.append(job)
    session.commit()
    for job in jobs:
        session.refresh(job)
    return jobs


def estimate_calls(campaign: SearchCampaign) -> int:
    """Estimativa de chamadas (limitada por max_calls, se definido)."""
    base = len(campaign.terms or []) * len(campaign.regions or []) * max(campaign.max_pages, 1)
    if campaign.max_calls:
        return min(base, campaign.max_calls)
    return base
