from app.enums import ContactChannel, SiteClass
from app.models.audit import SiteAudit
from app.models.crm import OutreachDraft
from app.models.places import Place
from app.services import outreach_service
from sqlalchemy import func, select


def _lead(session, pid, site_class, **kw):
    defaults = dict(name="Clínica X", category="clínica odontológica", reviews_count=100, rating=4.8)
    defaults.update(kw)
    p = Place(place_id=pid, **defaults)
    session.add(p)
    session.flush()
    session.add(SiteAudit(place_id=pid, site_class=site_class))
    session.commit()
    return p


def test_draft_sem_site(session):
    p = _lead(session, "a", SiteClass.SEM_SITE)
    d = outreach_service.generate_draft(session, p)
    assert d.channel == ContactChannel.WHATSAPP
    assert "site próprio" in d.text
    assert "Clínica X" in d.text
    assert "100 avaliações" in d.text


def test_draft_rede_social(session):
    p = _lead(session, "b", SiteClass.REDE_SOCIAL)
    d = outreach_service.generate_draft(session, p)
    assert "redes sociais" in d.text


def test_draft_obsoleto(session):
    p = _lead(session, "c", SiteClass.SITE_OBSOLETO)
    d = outreach_service.generate_draft(session, p)
    assert "modernizar" in d.text


def test_draft_is_persisted_and_listed(session):
    p = _lead(session, "d", SiteClass.SEM_SITE)
    outreach_service.generate_draft(session, p)
    n = session.scalar(
        select(func.count()).select_from(OutreachDraft).where(OutreachDraft.place_id == "d")
    )
    assert n == 1
    assert len(outreach_service.list_drafts(session, "d")) == 1
