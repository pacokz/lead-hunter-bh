import httpx

from app.enums import PipelineState, SiteClass
from app.models.audit import SiteAudit, SiteAuditIssue
from app.models.pipeline import LeadPipeline
from app.models.places import Place
from app.services import audit_service
from sqlalchemy import func, select


def _place(session, **kw):
    defaults = dict(place_id="p1", name="Empresa", category="clínica médica")
    defaults.update(kw)
    place = Place(**defaults)
    session.add(place)
    session.flush()
    session.add(LeadPipeline(place_id=place.place_id, state=PipelineState.DISCOVERED))
    session.commit()
    return place


def test_audit_sem_site_marca_pipeline_auditado(session):
    place = _place(session, website=None)
    audit = audit_service.audit_place(session, place)

    assert audit.site_class == SiteClass.SEM_SITE
    lp = session.scalar(select(LeadPipeline).where(LeadPipeline.place_id == "p1"))
    assert lp.state == PipelineState.AUDITED
    issues = session.scalar(select(func.count()).select_from(SiteAuditIssue))
    assert issues >= 1


def test_audit_rede_social_captura_handle(session):
    place = _place(session, place_id="p2", website="https://instagram.com/minhaclinica")
    audit = audit_service.audit_place(session, place)

    assert audit.site_class == SiteClass.REDE_SOCIAL
    refreshed = session.get(Place, "p2")
    assert refreshed.instagram_handle == "minhaclinica"


def test_audit_site_real_mockado(session):
    place = _place(session, place_id="p3", website="https://clinicaok.com.br")
    html = '<html><head><title>OK</title><meta name="viewport" content="x"></head><body></body></html>'
    client = httpx.Client(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, text=html)),
        follow_redirects=True,
    )
    audit = audit_service.audit_place(session, place, client=client)
    assert audit.https is True
    assert audit.site_class in {SiteClass.SITE_FRACO, SiteClass.SITE_RAZOAVEL, SiteClass.SITE_BOM}


def test_audit_pending_pula_descartado(session):
    # qualificado (audita) vs descartado (pula)
    p_ok = _place(session, place_id="ok", website=None)
    p_out = Place(place_id="out", name="X", website=None)
    session.add(p_out)
    session.flush()
    session.add(LeadPipeline(place_id="out", state=PipelineState.DISQUALIFIED))
    session.commit()

    audits = audit_service.audit_pending(session, limit=50)
    audited_ids = {a.place_id for a in audits}
    assert "ok" in audited_ids
    assert "out" not in audited_ids
