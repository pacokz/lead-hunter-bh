from app.enums import CommercialStage, ScoreBand
from app.models.crm import CommercialPipeline
from app.models.pipeline import LeadScore
from app.models.places import Place
from app.services import crm_service
from sqlalchemy import select


def _scored(session, pid, band):
    p = Place(place_id=pid, name=f"Lead {pid}")
    session.add(p)
    session.flush()
    session.add(LeadScore(place_id=pid, score=80, band=band))
    session.commit()
    return p


def test_promote_only_hot_leads(session):
    _scored(session, "a", ScoreBand.PRIORIDADE)
    _scored(session, "b", ScoreBand.ALTO_POTENCIAL)
    _scored(session, "c", ScoreBand.BAIXO_POTENCIAL)

    ids = crm_service.promote_qualified(session)
    assert set(ids) == {"a", "b"}

    cards = list(session.scalars(select(CommercialPipeline)))
    assert {c.place_id for c in cards} == {"a", "b"}
    assert all(c.stage == CommercialStage.NOVO for c in cards)


def test_promote_is_idempotent(session):
    _scored(session, "a", ScoreBand.PRIORIDADE)
    crm_service.promote_qualified(session)
    again = crm_service.promote_qualified(session)
    assert again == []


def test_move_stage(session):
    p = Place(place_id="x", name="X")
    session.add(p)
    session.commit()
    cp = crm_service.move_stage(session, "x", CommercialStage.CONTATADO)
    assert cp.stage == CommercialStage.CONTATADO
    cp2 = crm_service.move_stage(session, "x", CommercialStage.REUNIAO)
    assert cp2.stage == CommercialStage.REUNIAO
