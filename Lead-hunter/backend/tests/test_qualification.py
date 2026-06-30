from app.enums import PipelineState
from app.models.places import Place
from app.services import qualification_service


def _place(session, **kw) -> Place:
    defaults = dict(
        place_id="p1",
        name="Empresa",
        category="clínica odontológica",
        rating=4.5,
        reviews_count=40,
        business_status="OPERATIONAL",
    )
    defaults.update(kw)
    place = Place(**defaults)
    session.add(place)
    session.commit()
    return place


def test_qualifies_good_lead(session):
    place = _place(session)
    state, reasons = qualification_service.qualify_place(session, place)
    assert state == PipelineState.QUALIFIED
    assert reasons == []


def test_disqualifies_low_rating(session):
    place = _place(session, place_id="p2", rating=2.0)
    state, reasons = qualification_service.qualify_place(session, place)
    assert state == PipelineState.DISQUALIFIED
    assert any("nota" in r for r in reasons)


def test_disqualifies_few_reviews(session):
    place = _place(session, place_id="p3", reviews_count=3)
    state, reasons = qualification_service.qualify_place(session, place)
    assert state == PipelineState.DISQUALIFIED
    assert any("reviews" in r for r in reasons)


def test_disqualifies_closed_business(session):
    place = _place(session, place_id="p4", business_status="CLOSED_PERMANENTLY")
    state, reasons = qualification_service.qualify_place(session, place)
    assert state == PipelineState.DISQUALIFIED
