"""Execução de search_jobs: chama o Places, persiste com dedup e avança o pipeline."""
from __future__ import annotations

from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import JobStatus, PipelineState
from app.integrations import google_places
from app.models.pipeline import LeadPipeline
from app.models.places import Place, SearchCampaign, SearchJob
from app.services import quota_service
from app.services.logging_service import log_error, log_operation


def _upsert_place(session: Session, data: dict) -> Place:
    place_id = data["place_id"]
    place = session.get(Place, place_id)
    if place is None:
        place = Place(place_id=place_id)
        session.add(place)
    for key, value in data.items():
        if key == "place_id":
            continue
        setattr(place, key, value)
    session.flush()  # garante que places exista antes do FK de lead_pipeline
    return place


def _ensure_pipeline(session: Session, place_id: str) -> None:
    exists = session.scalar(select(LeadPipeline).where(LeadPipeline.place_id == place_id))
    if exists is None:
        session.add(LeadPipeline(place_id=place_id, state=PipelineState.DISCOVERED))


def execute_search_job(
    session: Session,
    job: SearchJob,
    *,
    api_key: str,
    client: httpx.Client | None = None,
) -> SearchJob:
    if job.status == JobStatus.DONE:
        return job  # não repetir job concluído

    quota_service.ensure_can_call(session)

    job.status = JobStatus.RUNNING
    job.attempts += 1
    session.commit()

    query = f"{job.term} em {job.region}, Belo Horizonte"
    try:
        places, next_token = google_places.search_text(
            query, api_key=api_key, page_token=job.page_token, client=client
        )
        quota_service.record_usage(session, "places:searchText", campaign_id=job.campaign_id)

        campaign = session.get(SearchCampaign, job.campaign_id)
        new_count = 0
        for data in places:
            if not data.get("place_id"):
                continue
            existed = session.get(Place, data["place_id"]) is not None
            place = _upsert_place(session, data)
            if place.category is None and campaign and campaign.category:
                place.category = campaign.category
            _ensure_pipeline(session, data["place_id"])
            if not existed:
                new_count += 1

        job.results_count = len(places)
        job.status = JobStatus.DONE
        job.error = None  # limpa erro de tentativa anterior
        job.executed_at = datetime.now(timezone.utc)

        if next_token and campaign and job.page < campaign.max_pages:
            session.add(
                SearchJob(
                    campaign_id=job.campaign_id,
                    term=job.term,
                    region=job.region,
                    page=job.page + 1,
                    page_token=next_token,
                )
            )
        session.commit()
        log_operation(
            session,
            "search_job_done",
            place_id=None,
            payload={"job_id": job.id, "results": len(places), "new": new_count},
        )
        return job
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        job.status = JobStatus.ERROR
        job.error = str(exc)
        session.commit()
        log_error(session, f"search_job {job.id} falhou: {exc}")
        raise
