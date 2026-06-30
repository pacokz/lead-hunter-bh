"""Controle de cota da Google Places API.

Verifica limites diário e mensal ANTES de cada chamada e registra cada uso.
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.places import ApiUsage


class QuotaExceeded(Exception):
    pass


def today_count(session: Session) -> int:
    return (
        session.scalar(
            select(func.count()).select_from(ApiUsage).where(ApiUsage.day == date.today())
        )
        or 0
    )


def month_count(session: Session) -> int:
    month = date.today().strftime("%Y-%m")
    return (
        session.scalar(
            select(func.count()).select_from(ApiUsage).where(ApiUsage.month == month)
        )
        or 0
    )


def ensure_can_call(
    session: Session,
    *,
    daily_limit: int | None = None,
    monthly_limit: int | None = None,
) -> None:
    daily_limit = settings.api_daily_limit if daily_limit is None else daily_limit
    monthly_limit = settings.api_monthly_limit if monthly_limit is None else monthly_limit
    if today_count(session) >= daily_limit:
        raise QuotaExceeded(f"Limite diário de chamadas atingido ({daily_limit}).")
    if month_count(session) >= monthly_limit:
        raise QuotaExceeded(f"Limite mensal de chamadas atingido ({monthly_limit}).")


def record_usage(
    session: Session,
    endpoint: str,
    *,
    cost: float | None = None,
    campaign_id: int | None = None,
) -> ApiUsage:
    today = date.today()
    usage = ApiUsage(
        endpoint=endpoint,
        estimated_cost=settings.api_cost_per_call if cost is None else cost,
        day=today,
        month=today.strftime("%Y-%m"),
        campaign_id=campaign_id,
    )
    session.add(usage)
    session.commit()
    session.refresh(usage)
    return usage
