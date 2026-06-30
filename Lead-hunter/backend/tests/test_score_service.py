from app.enums import PipelineState, ScoreBand, SiteClass
from app.models.audit import SiteAudit
from app.models.pipeline import LeadPipeline, LeadScoreComponent
from app.models.places import Place
from app.services import score_service
from sqlalchemy import func, select


def test_band_thresholds():
    assert score_service.band_for(90) == ScoreBand.PRIORIDADE
    assert score_service.band_for(85) == ScoreBand.PRIORIDADE
    assert score_service.band_for(70) == ScoreBand.ALTO_POTENCIAL
    assert score_service.band_for(60) == ScoreBand.REVISAR
    assert score_service.band_for(40) == ScoreBand.BAIXO_POTENCIAL
    assert score_service.band_for(39) == ScoreBand.DESCARTAR


def test_reviews_and_rating_points():
    assert score_service.reviews_points(241) == 20
    assert score_service.reviews_points(0) == 0
    assert score_service.rating_points(5.0) == 15
    assert score_service.rating_points(None) == 0


def _lead(session, place_id, site_class, **kw):
    defaults = dict(name="X", category="clínica odontológica", rating=5.0, reviews_count=241, phone="(31) 1")
    defaults.update(kw)
    place = Place(place_id=place_id, **defaults)
    session.add(place)
    session.flush()
    session.add(LeadPipeline(place_id=place_id, state=PipelineState.AUDITED))
    session.add(SiteAudit(place_id=place_id, site_class=site_class))
    session.commit()
    return place


def test_consolidado_sem_site_eh_prioridade(session):
    place = _lead(session, "p1", SiteClass.SEM_SITE)
    score = score_service.score_place(session, place)
    # 40 (sem site) + 20 (241 reviews) + 15 (5.0) + 6 (phone) + 9 (segmento neutro) = 90
    assert score.score == 90
    assert score.band == ScoreBand.PRIORIDADE


def test_componentes_somam_o_score(session):
    place = _lead(session, "p2", SiteClass.SEM_SITE)
    score = score_service.score_place(session, place)
    soma = session.scalar(
        select(func.sum(LeadScoreComponent.value)).where(LeadScoreComponent.score_id == score.id)
    )
    assert int(soma) == score.score
    n = session.scalar(
        select(func.count()).select_from(LeadScoreComponent).where(LeadScoreComponent.score_id == score.id)
    )
    assert n == 5


def test_site_bom_pontua_menos_que_sem_site(session):
    sem_site = _lead(session, "a", SiteClass.SEM_SITE)
    site_bom = _lead(session, "b", SiteClass.SITE_BOM)
    s1 = score_service.score_place(session, sem_site)
    s2 = score_service.score_place(session, site_bom)
    assert s1.score > s2.score
    assert s1.score - s2.score == 38  # 40 - 2 de diferença no componente de site


def test_pipeline_vai_para_scored(session):
    place = _lead(session, "p3", SiteClass.SITE_OBSOLETO)
    score_service.score_place(session, place)
    lp = session.scalar(select(LeadPipeline).where(LeadPipeline.place_id == "p3"))
    assert lp.state == PipelineState.SCORED
