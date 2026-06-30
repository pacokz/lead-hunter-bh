"""Testa execução de job com o Places mockado: dedup, pipeline e paginação."""
from app.enums import JobStatus, PipelineState
from app.models.pipeline import LeadPipeline
from app.models.places import Place, SearchJob
from app.services import campaign_service, search_service
from sqlalchemy import func, select

PLACE_A = {
    "place_id": "A1",
    "name": "Clínica A",
    "primary_type": "dentist",
    "address": "Rua A",
    "phone": "(31) 1",
    "website": None,
    "rating": 4.6,
    "reviews_count": 50,
    "lat": -19.9,
    "lng": -43.9,
    "business_status": "OPERATIONAL",
    "google_maps_uri": "https://maps/1",
}


def _campaign_with_job(session, max_pages=1):
    campaign = campaign_service.create_campaign(
        session, name="c", terms=["dentista"], regions=["Savassi"], max_pages=max_pages
    )
    jobs = campaign_service.generate_jobs(session, campaign)
    return campaign, jobs[0]


def test_execute_persists_places_and_pipeline(session, monkeypatch):
    monkeypatch.setattr(
        search_service.google_places,
        "search_text",
        lambda *a, **k: ([PLACE_A], None),
    )
    _, job = _campaign_with_job(session)
    search_service.execute_search_job(session, job, api_key="FAKE")

    assert job.status == JobStatus.DONE
    assert job.results_count == 1
    place = session.get(Place, "A1")
    assert place is not None and place.name == "Clínica A"
    lp = session.scalar(select(LeadPipeline).where(LeadPipeline.place_id == "A1"))
    assert lp.state == PipelineState.DISCOVERED


def test_dedup_does_not_duplicate_place(session, monkeypatch):
    monkeypatch.setattr(
        search_service.google_places,
        "search_text",
        lambda *a, **k: ([PLACE_A], None),
    )
    _, job1 = _campaign_with_job(session)
    search_service.execute_search_job(session, job1, api_key="FAKE")

    # Outro job retornando o MESMO place_id
    campaign2 = campaign_service.create_campaign(
        session, name="c2", terms=["dentista"], regions=["Lourdes"], max_pages=1
    )
    job2 = campaign_service.generate_jobs(session, campaign2)[0]
    search_service.execute_search_job(session, job2, api_key="FAKE")

    total = session.scalar(select(func.count()).select_from(Place))
    assert total == 1  # dedup por place_id


def test_pagination_creates_next_page_job(session, monkeypatch):
    monkeypatch.setattr(
        search_service.google_places,
        "search_text",
        lambda *a, **k: ([PLACE_A], "TOKEN2"),
    )
    _, job = _campaign_with_job(session, max_pages=2)
    search_service.execute_search_job(session, job, api_key="FAKE")

    next_jobs = list(
        session.scalars(select(SearchJob).where(SearchJob.page == 2))
    )
    assert len(next_jobs) == 1
    assert next_jobs[0].page_token == "TOKEN2"


def test_done_job_is_not_repeated(session, monkeypatch):
    calls = {"n": 0}

    def fake(*a, **k):
        calls["n"] += 1
        return ([PLACE_A], None)

    monkeypatch.setattr(search_service.google_places, "search_text", fake)
    _, job = _campaign_with_job(session)
    search_service.execute_search_job(session, job, api_key="FAKE")
    search_service.execute_search_job(session, job, api_key="FAKE")  # 2ª vez: no-op
    assert calls["n"] == 1
