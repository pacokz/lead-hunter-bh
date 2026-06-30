"""Executa auditoria de um lead, persiste e avança o pipeline.

Não audita leads já descartados (economia, conforme PLAYBOOK).
"""
from __future__ import annotations

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.enums import PipelineState, SiteClass
from app.integrations import site_auditor, site_screenshotter
from app.models.audit import SiteAudit, SiteAuditIssue, SiteScreenshot
from app.models.pipeline import LeadPipeline
from app.models.places import Place

# Estados em que NÃO faz sentido auditar
SKIP_STATES = {PipelineState.DISQUALIFIED, PipelineState.LOST}

# Classes em que NÃO há site renderizável pra fotografar
NO_RENDER = {SiteClass.SEM_SITE, SiteClass.REDE_SOCIAL, SiteClass.FORA_DO_AR}


def audit_place(
    session: Session,
    place: Place,
    *,
    client: httpx.Client | None = None,
    screenshots: bool = False,
) -> SiteAudit:
    data = site_auditor.audit_site(place.website, client=client)

    audit = SiteAudit(
        place_id=place.place_id,
        site_class=data["site_class"],
        https=data["https"],
        responsive=data["responsive"],
        http_status=data["http_status"],
        final_url=data["final_url"],
        response_time_s=data["response_time_s"],
        title=data["title"],
        meta_description=data["meta_description"],
        has_form=data["has_form"],
        has_whatsapp=data["has_whatsapp"],
        social_links=data["social_links"],
    )
    session.add(audit)
    session.flush()

    for issue_type, severity, description in data["issues"]:
        session.add(
            SiteAuditIssue(
                audit_id=audit.id,
                type=issue_type,
                severity=severity,
                description=description,
            )
        )

    # Captura visual (Playwright) — só sob demanda e só se há site renderizável.
    if screenshots and data["site_class"] not in NO_RENDER:
        shot = site_screenshotter.capture(
            data["final_url"] or place.website, settings.screenshot_dir, place.place_id
        )
        for s in shot["screenshots"]:
            session.add(SiteScreenshot(audit_id=audit.id, viewport=s["viewport"], path=s["path"]))
        for issue_type, severity, description in shot["issues"]:
            session.add(
                SiteAuditIssue(audit_id=audit.id, type=issue_type, severity=severity, description=description)
            )

    if data["instagram_handle"] and not place.instagram_handle:
        place.instagram_handle = data["instagram_handle"]

    pipeline = session.scalar(
        select(LeadPipeline).where(LeadPipeline.place_id == place.place_id)
    )
    if pipeline is None:
        pipeline = LeadPipeline(place_id=place.place_id)
        session.add(pipeline)
    pipeline.state = PipelineState.AUDITED

    session.commit()
    session.refresh(audit)
    return audit


def audit_pending(
    session: Session,
    *,
    limit: int = 50,
    client: httpx.Client | None = None,
) -> list[SiteAudit]:
    """Audita leads ainda não auditados e não descartados."""
    audited_ids = select(SiteAudit.place_id)
    stmt = (
        select(Place)
        .join(LeadPipeline, LeadPipeline.place_id == Place.place_id)
        .where(~LeadPipeline.state.in_(SKIP_STATES))
        .where(Place.place_id.not_in(audited_ids))
        .limit(limit)
    )
    places = list(session.scalars(stmt))
    results = []
    for place in places:
        results.append(audit_place(session, place, client=client))
    return results
