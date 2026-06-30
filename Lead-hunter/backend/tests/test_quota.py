import pytest

from app.services import quota_service
from app.services.quota_service import QuotaExceeded


def test_record_and_count(session):
    quota_service.record_usage(session, "places:searchText")
    quota_service.record_usage(session, "places:searchText")
    assert quota_service.today_count(session) == 2
    assert quota_service.month_count(session) == 2


def test_ensure_can_call_blocks_at_daily_limit(session):
    quota_service.record_usage(session, "places:searchText")
    quota_service.record_usage(session, "places:searchText")
    # Limite diário 2 já atingido → deve bloquear
    with pytest.raises(QuotaExceeded):
        quota_service.ensure_can_call(session, daily_limit=2, monthly_limit=1000)


def test_ensure_can_call_blocks_at_monthly_limit(session):
    quota_service.record_usage(session, "places:searchText")
    with pytest.raises(QuotaExceeded):
        quota_service.ensure_can_call(session, daily_limit=1000, monthly_limit=1)


def test_ensure_can_call_passes_under_limits(session):
    quota_service.ensure_can_call(session, daily_limit=10, monthly_limit=100)
