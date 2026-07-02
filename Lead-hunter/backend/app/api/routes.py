from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_session
from app.enums import CommercialStage, ContactChannel, JobStatus
from app.models.audit import SiteAudit, SiteAuditIssue, SiteScreenshot
from app.models.config import Category, Region
from app.models.crm import CommercialPipeline, FollowUp, Interaction
from app.models.pipeline import LeadPipeline, LeadScore, LeadScoreComponent
from app.models.places import Place, SearchCampaign, SearchJob
from app.schemas.places import (
    AuditOut,
    CampaignCreate,
    CampaignOut,
    CategoryCreate,
    CategoryOut,
    CrmCardOut,
    DemoOut,
    FollowUpAgendaOut,
    FollowUpCreate,
    FollowUpOut,
    InteractionCreate,
    InteractionOut,
    JobOut,
    LeadOut,
    OutreachDraftOut,
    RankedLeadOut,
    RegionCreate,
    RegionOut,
    ScoreOut,
)
from app.services import (
    audit_service,
    campaign_service,
    crm_service,
    followup_service,
    outreach_service,
    quota_service,
    score_service,
    search_service,
)

router = APIRouter()


@router.post("/campaigns", response_model=CampaignOut)
def create_campaign(payload: CampaignCreate, session: Session = Depends(get_session)):
    campaign = campaign_service.create_campaign(session, **payload.model_dump())
    campaign_service.generate_jobs(session, campaign)
    return campaign


@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(session: Session = Depends(get_session)):
    return list(session.scalars(select(SearchCampaign).order_by(SearchCampaign.id.desc())))


@router.get("/campaigns/{campaign_id}/jobs", response_model=list[JobOut])
def list_jobs(campaign_id: int, session: Session = Depends(get_session)):
    return list(
        session.scalars(
            select(SearchJob).where(SearchJob.campaign_id == campaign_id).order_by(SearchJob.id)
        )
    )


@router.get("/jobs", response_model=list[JobOut])
def list_all_jobs(campaign_id: int | None = None, session: Session = Depends(get_session)):
    stmt = select(SearchJob).order_by(SearchJob.id.desc()).limit(500)
    if campaign_id is not None:
        stmt = select(SearchJob).where(SearchJob.campaign_id == campaign_id).order_by(SearchJob.id)
    return list(session.scalars(stmt))


@router.get("/settings")
def get_settings():
    return {
        "app_env": settings.app_env,
        "api_daily_limit": settings.api_daily_limit,
        "api_monthly_limit": settings.api_monthly_limit,
        "min_rating": settings.min_rating,
        "min_reviews": settings.min_reviews,
        "min_score": settings.min_score,
        "google_key_set": bool(settings.google_places_api_key),
    }


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(session: Session = Depends(get_session)):
    return list(session.scalars(select(Category).order_by(Category.priority.desc())))


@router.post("/categories", response_model=CategoryOut)
def add_category(payload: CategoryCreate, session: Session = Depends(get_session)):
    existing = session.scalar(select(Category).where(Category.name == payload.name))
    if existing:
        raise HTTPException(status_code=409, detail="Categoria já existe.")
    cat = Category(name=payload.name, priority=payload.priority, active=True)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@router.get("/regions", response_model=list[RegionOut])
def list_regions(session: Session = Depends(get_session)):
    return list(session.scalars(select(Region).order_by(Region.name)))


# ── CRM ────────────────────────────────────────────────────────────────


@router.post("/crm/promote")
def promote_to_crm(limit: int = 100, by: str | None = None, session: Session = Depends(get_session)):
    ids = crm_service.promote_qualified(session, limit=limit)
    if by and ids:
        # quem promoveu vira o responsável inicial dos cards novos
        for cp in session.scalars(
            select(CommercialPipeline).where(CommercialPipeline.place_id.in_(ids))
        ):
            if not cp.owner:
                cp.owner = by
        session.commit()
    return {"promoted": len(ids), "place_ids": ids}


@router.get("/crm", response_model=list[CrmCardOut])
def crm_board(session: Session = Depends(get_session)):
    rows = session.execute(
        select(CommercialPipeline, Place).join(Place, Place.place_id == CommercialPipeline.place_id)
    ).all()
    cards = []
    for cp, place in rows:
        score = session.scalar(
            select(LeadScore).where(LeadScore.place_id == place.place_id).order_by(LeadScore.id.desc())
        )
        site_class = session.scalar(
            select(SiteAudit.site_class)
            .where(SiteAudit.place_id == place.place_id)
            .order_by(SiteAudit.id.desc())
        )
        cards.append(
            CrmCardOut(
                place_id=place.place_id,
                name=place.name,
                stage=cp.stage.value,
                score=score.score if score else None,
                band=score.band.value if score else None,
                site_class=site_class.value if site_class else None,
                phone=place.phone,
                instagram_handle=place.instagram_handle,
                owner=cp.owner,
            )
        )
    return cards


@router.post("/leads/{place_id}/crm/owner", response_model=CrmCardOut)
def update_owner(place_id: str, owner: str, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    cp = session.scalar(
        select(CommercialPipeline).where(CommercialPipeline.place_id == place_id)
    )
    if cp is None:
        raise HTTPException(status_code=404, detail="Lead não está no CRM.")
    cp.owner = owner
    session.commit()
    return CrmCardOut(
        place_id=place.place_id,
        name=place.name,
        stage=cp.stage.value,
        score=None,
        band=None,
        site_class=None,
        phone=place.phone,
        instagram_handle=place.instagram_handle,
        owner=cp.owner,
    )


@router.post("/leads/{place_id}/crm/stage", response_model=CrmCardOut)
def update_stage(place_id: str, stage: CommercialStage, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    cp = crm_service.move_stage(session, place_id, stage)
    return CrmCardOut(
        place_id=place.place_id,
        name=place.name,
        stage=cp.stage.value,
        score=None,
        band=None,
        site_class=None,
        phone=place.phone,
        instagram_handle=place.instagram_handle,
    )


# ── Outreach ───────────────────────────────────────────────────────────


@router.post("/leads/{place_id}/outreach", response_model=OutreachDraftOut)
def create_outreach(
    place_id: str,
    channel: ContactChannel = ContactChannel.WHATSAPP,
    session: Session = Depends(get_session),
):
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return outreach_service.generate_draft(session, place, channel)


@router.get("/leads/{place_id}/outreach", response_model=list[OutreachDraftOut])
def list_outreach(place_id: str, session: Session = Depends(get_session)):
    return outreach_service.list_drafts(session, place_id)


@router.post("/regions", response_model=RegionOut)
def add_region(payload: RegionCreate, session: Session = Depends(get_session)):
    existing = session.scalar(select(Region).where(Region.name == payload.name))
    if existing:
        raise HTTPException(status_code=409, detail="Região já existe.")
    region = Region(name=payload.name, active=True)
    session.add(region)
    session.commit()
    session.refresh(region)
    return region


@router.post("/jobs/{job_id}/execute", response_model=JobOut)
def execute_job(job_id: int, session: Session = Depends(get_session)):
    if not settings.google_places_api_key:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_PLACES_API_KEY não configurada — defina antes de buscas reais.",
        )
    job = session.get(SearchJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    search_service.execute_search_job(session, job, api_key=settings.google_places_api_key)
    return job


@router.get("/leads", response_model=list[LeadOut])
def list_leads(limit: int = 100, session: Session = Depends(get_session)):
    return list(session.scalars(select(Place).limit(limit)))


@router.post("/leads/{place_id}/audit", response_model=AuditOut)
def audit_lead(place_id: str, screenshots: bool = True, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return audit_service.audit_place(session, place, screenshots=screenshots)


@router.post("/audits/run", response_model=list[AuditOut])
def run_pending_audits(limit: int = 50, session: Session = Depends(get_session)):
    return audit_service.audit_pending(session, limit=limit)


@router.post("/leads/{place_id}/score", response_model=ScoreOut)
def score_lead(place_id: str, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return score_service.score_place(session, place)


@router.post("/scores/run", response_model=list[ScoreOut])
def run_pending_scores(limit: int = 100, session: Session = Depends(get_session)):
    return score_service.score_pending(session, limit=limit)


@router.post("/pipeline/run")
def run_pipeline(
    audit_batch: int = 50,
    max_batches: int = 10,
    session: Session = Depends(get_session),
):
    """Audita os lugares coletados (em lotes) e pontua os auditados.

    Sem custo de API Google — é o mesmo passo do cron diário, sob demanda.
    Transforma "lugar coletado" em "lead pontuado" (que aparece na tela de Leads).
    """
    audited = 0
    for _ in range(max(1, max_batches)):
        done = audit_service.audit_pending(session, limit=audit_batch)
        audited += len(done)
        if len(done) < audit_batch:
            break
    scored = score_service.score_pending(session, limit=1000)
    return {"audited": audited, "scored": len(scored)}


# ---- Interações + Follow-ups -----------------------------------------------

def _require_place(session: Session, place_id: str) -> Place:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return place


@router.get("/leads/{place_id}/interactions", response_model=list[InteractionOut])
def list_interactions(place_id: str, session: Session = Depends(get_session)):
    return followup_service.list_interactions(session, place_id)


@router.post("/leads/{place_id}/interactions", response_model=InteractionOut)
def log_interaction(place_id: str, payload: InteractionCreate, session: Session = Depends(get_session)):
    _require_place(session, place_id)
    channel = None
    if payload.channel:
        try:
            channel = ContactChannel(payload.channel)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Canal inválido: {payload.channel}")
    return followup_service.log_interaction(
        session,
        place_id,
        channel=channel,
        direction=payload.direction,
        content=payload.content,
        created_by=payload.created_by,
    )


@router.get("/leads/{place_id}/follow-ups", response_model=list[FollowUpOut])
def list_followups(place_id: str, session: Session = Depends(get_session)):
    return followup_service.list_followups(session, place_id)


@router.post("/leads/{place_id}/follow-ups", response_model=FollowUpOut)
def create_followup(place_id: str, payload: FollowUpCreate, session: Session = Depends(get_session)):
    _require_place(session, place_id)
    return followup_service.schedule_followup(
        session,
        place_id,
        type=payload.type,
        scheduled_at=payload.scheduled_at,
        note=payload.note,
        created_by=payload.created_by,
    )


@router.post("/follow-ups/{followup_id}/done", response_model=FollowUpOut)
def complete_followup(followup_id: int, session: Session = Depends(get_session)):
    fu = followup_service.complete_followup(session, followup_id)
    if fu is None:
        raise HTTPException(status_code=404, detail="Follow-up não encontrado.")
    return fu


@router.delete("/follow-ups/{followup_id}")
def delete_followup(followup_id: int, session: Session = Depends(get_session)):
    if not followup_service.delete_followup(session, followup_id):
        raise HTTPException(status_code=404, detail="Follow-up não encontrado.")
    return {"deleted": followup_id}


@router.get("/follow-ups/upcoming", response_model=list[FollowUpAgendaOut])
def upcoming_followups(limit: int = 100, session: Session = Depends(get_session)):
    rows = followup_service.upcoming(session, limit=limit)
    names = dict(
        session.execute(
            select(Place.place_id, Place.name).where(
                Place.place_id.in_([f.place_id for f in rows] or [""])
            )
        ).all()
    )
    return [
        {
            "id": f.id,
            "place_id": f.place_id,
            "place_name": names.get(f.place_id),
            "type": f.type,
            "scheduled_at": f.scheduled_at,
            "note": f.note,
            "done": f.done,
            "done_at": f.done_at,
            "created_by": f.created_by,
        }
        for f in rows
    ]


# ---- Demos (geradas pelos agentes; fonte = pasta demos-shared montada) ------


@router.get("/demos", response_model=list[DemoOut])
def list_demos():
    import json as _json
    from datetime import datetime, timezone
    from pathlib import Path

    root = Path(settings.demos_container_dir)
    if not root.is_dir():
        return []

    out: list[DemoOut] = []
    for d in root.iterdir():
        if not d.is_dir() or d.name.startswith("_") or d.name.startswith("."):
            continue

        meta: dict = {}
        spec = d / "spec.json"
        if spec.exists():
            try:
                meta = _json.loads(spec.read_text(encoding="utf-8")).get("meta") or {}
            except Exception:  # noqa: BLE001
                meta = {}

        critique: dict | None = None
        cpath = d / "_qa" / "critique.json"
        if cpath.exists():
            try:
                critique = _json.loads(cpath.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                critique = None

        published_url = None
        vproj = d / ".vercel" / "project.json"
        if vproj.exists():
            try:
                pname = _json.loads(vproj.read_text(encoding="utf-8")).get("projectName")
                if pname:
                    published_url = f"https://{pname}.vercel.app"
            except Exception:  # noqa: BLE001
                pass

        shots = {
            vp: f"/demos-files/{d.name}/_qa/{vp}.png"
            for vp in ("desktop", "tablet", "mobile")
            if (d / "_qa" / f"{vp}.png").exists()
        }
        index = d / "index.html"
        has_index = index.exists()

        blockers = list((critique or {}).get("blockers") or [])
        score = (critique or {}).get("score")
        publishable = (critique or {}).get("publishable")
        if published_url:
            status = "PUBLICADA"
        elif critique and not blockers and (publishable is not False) and (score is None or score >= 7):
            status = "APROVADA"
        elif critique:
            status = "EM_QA"
        else:
            status = "RASCUNHO"

        try:
            mtime = (index if has_index else d).stat().st_mtime
            updated_at = datetime.fromtimestamp(mtime, tz=timezone.utc)
        except OSError:
            updated_at = None

        out.append(
            DemoOut(
                slug=d.name,
                name=meta.get("nome") or d.name.replace("-", " ").title(),
                bairro=meta.get("bairro"),
                status=status,
                published_url=published_url,
                craft_score=score,
                publishable=publishable,
                blockers=blockers,
                craft_issues=list((critique or {}).get("craft_issues") or []),
                screenshots=shots,
                preview_path=f"/demos-files/{d.name}/index.html" if has_index else None,
                updated_at=updated_at,
            )
        )

    out.sort(key=lambda x: (x.updated_at is not None, x.updated_at), reverse=True)
    return out


@router.get("/stats")
def stats(session: Session = Depends(get_session)):
    by_site = {
        k.value: v
        for k, v in session.execute(
            select(SiteAudit.site_class, func.count()).group_by(SiteAudit.site_class)
        ).all()
    }
    by_band = {
        k.value: v
        for k, v in session.execute(
            select(LeadScore.band, func.count()).group_by(LeadScore.band)
        ).all()
    }
    ruins = sum(
        by_site.get(c, 0)
        for c in ("SEM_SITE", "FORA_DO_AR", "REDE_SOCIAL", "SITE_OBSOLETO", "SITE_FRACO")
    )
    prioritarios = by_band.get("PRIORIDADE", 0) + by_band.get("ALTO_POTENCIAL", 0)
    return {
        "total_places": session.scalar(select(func.count()).select_from(Place)),
        "by_site_class": by_site,
        "by_band": by_band,
        "sem_site": by_site.get("SEM_SITE", 0),
        "sites_ruins": ruins,
        "prioritarios": prioritarios,
        "audited": sum(by_site.values()),
        "scored": sum(by_band.values()),
        "campaigns": session.scalar(select(func.count()).select_from(SearchCampaign)),
        "jobs_error": session.scalar(
            select(func.count()).select_from(SearchJob).where(SearchJob.status == JobStatus.ERROR)
        ),
        "api_today": quota_service.today_count(session),
        "api_month": quota_service.month_count(session),
    }


@router.get("/leads/{place_id}/context")
def lead_context(place_id: str, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    pipeline = session.scalar(select(LeadPipeline).where(LeadPipeline.place_id == place_id))
    audit = session.scalar(
        select(SiteAudit).where(SiteAudit.place_id == place_id).order_by(SiteAudit.id.desc())
    )
    issues = []
    screenshots = []
    if audit:
        issues = [
            {"type": i.type, "severity": i.severity, "description": i.description}
            for i in session.scalars(
                select(SiteAuditIssue).where(SiteAuditIssue.audit_id == audit.id)
            )
        ]
        screenshots = [
            {"viewport": s.viewport, "path": s.path}
            for s in session.scalars(
                select(SiteScreenshot).where(SiteScreenshot.audit_id == audit.id)
            )
        ]
    score = session.scalar(
        select(LeadScore).where(LeadScore.place_id == place_id).order_by(LeadScore.id.desc())
    )
    components = []
    if score:
        components = [
            {"component": c.component, "weight": c.weight, "value": c.value}
            for c in session.scalars(
                select(LeadScoreComponent).where(LeadScoreComponent.score_id == score.id)
            )
        ]

    return {
        "place": {
            "place_id": place.place_id,
            "name": place.name,
            "category": place.category,
            "address": place.address,
            "phone": place.phone,
            "website": place.website,
            "rating": place.rating,
            "reviews_count": place.reviews_count,
            "instagram_handle": place.instagram_handle,
            "google_maps_uri": place.google_maps_uri,
            "business_status": place.business_status,
        },
        "pipeline_state": pipeline.state.value if pipeline else None,
        "audit": (
            {
                "site_class": audit.site_class.value,
                "https": audit.https,
                "responsive": audit.responsive,
                "http_status": audit.http_status,
                "final_url": audit.final_url,
                "response_time_s": audit.response_time_s,
                "title": audit.title,
                "meta_description": audit.meta_description,
                "has_form": audit.has_form,
                "has_whatsapp": audit.has_whatsapp,
                "social_links": audit.social_links,
                "issues": issues,
                "screenshots": screenshots,
            }
            if audit
            else None
        ),
        "score": (
            {"score": score.score, "band": score.band.value, "components": components}
            if score
            else None
        ),
    }


@router.get("/leads/ranked", response_model=list[RankedLeadOut])
def ranked_leads(limit: int = 200, session: Session = Depends(get_session)):
    # 1 linha por lead com contagem/última data de contato registrado
    contact_sq = (
        select(
            Interaction.place_id.label("place_id"),
            func.count().label("contacts"),
            func.max(Interaction.created_at).label("last_contact_at"),
        )
        .group_by(Interaction.place_id)
        .subquery()
    )
    rows = session.execute(
        select(
            Place,
            LeadScore.score,
            LeadScore.band,
            contact_sq.c.contacts,
            contact_sq.c.last_contact_at,
            CommercialPipeline.stage,
        )
        .join(LeadScore, LeadScore.place_id == Place.place_id)
        .outerjoin(contact_sq, contact_sq.c.place_id == Place.place_id)
        .outerjoin(CommercialPipeline, CommercialPipeline.place_id == Place.place_id)
        .order_by(LeadScore.score.desc())
        .limit(limit)
    ).all()
    out = []
    for place, score, band, contacts, last_contact_at, stage in rows:
        site_class = session.scalar(
            select(SiteAudit.site_class)
            .where(SiteAudit.place_id == place.place_id)
            .order_by(SiteAudit.id.desc())
        )
        out.append(
            RankedLeadOut(
                place_id=place.place_id,
                name=place.name,
                category=place.category,
                rating=place.rating,
                reviews_count=place.reviews_count,
                site_class=site_class.value if site_class else None,
                score=score,
                band=band.value,
                phone=place.phone,
                instagram_handle=place.instagram_handle,
                contacted=bool(contacts),
                last_contact_at=last_contact_at,
                stage=stage.value if stage else None,
            )
        )
    return out
