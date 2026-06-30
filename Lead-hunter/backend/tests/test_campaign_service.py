from app.services import campaign_service


def test_generate_jobs_is_term_times_region(session):
    campaign = campaign_service.create_campaign(
        session,
        name="Clínicas Centro-Sul",
        category="clínica odontológica",
        terms=["clínica odontológica", "dentista"],
        regions=["Savassi", "Lourdes", "Funcionários"],
        max_pages=1,
    )
    jobs = campaign_service.generate_jobs(session, campaign)
    assert len(jobs) == 2 * 3
    assert all(j.page == 1 for j in jobs)
    assert {j.term for j in jobs} == {"clínica odontológica", "dentista"}


def test_estimate_calls_respects_max_calls(session):
    campaign = campaign_service.create_campaign(
        session,
        name="t",
        terms=["a", "b"],
        regions=["x", "y", "z"],
        max_pages=2,
        max_calls=5,
    )
    # 2 * 3 * 2 = 12, limitado a 5
    assert campaign_service.estimate_calls(campaign) == 5
