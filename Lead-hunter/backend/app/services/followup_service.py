"""Follow-ups e interações: registrar contatos feitos e agendar retornos.

Tudo manual — o Samuel registra o que fez (interação) e agenda o próximo passo
(follow-up). Nada é enviado automaticamente.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import ContactChannel
from app.models.crm import FollowUp, Interaction


# ---- Interações (histórico do que já foi feito) ----------------------------

def log_interaction(
    session: Session,
    place_id: str,
    *,
    channel: ContactChannel | None = None,
    direction: str | None = None,
    content: str | None = None,
    created_by: str | None = None,
) -> Interaction:
    it = Interaction(
        place_id=place_id,
        channel=channel,
        direction=direction,
        content=content,
        logged_by_samuel=True,
        created_by=created_by,
    )
    session.add(it)
    session.commit()
    session.refresh(it)
    return it


def list_interactions(session: Session, place_id: str) -> list[Interaction]:
    return list(
        session.scalars(
            select(Interaction)
            .where(Interaction.place_id == place_id)
            .order_by(Interaction.id.desc())
        )
    )


# ---- Follow-ups (o que ainda falta fazer) ----------------------------------

def schedule_followup(
    session: Session,
    place_id: str,
    *,
    type: str,
    scheduled_at: datetime | None = None,
    note: str | None = None,
    created_by: str | None = None,
) -> FollowUp:
    fu = FollowUp(
        place_id=place_id, type=type, scheduled_at=scheduled_at, note=note, created_by=created_by
    )
    session.add(fu)
    session.commit()
    session.refresh(fu)
    return fu


def list_followups(session: Session, place_id: str) -> list[FollowUp]:
    return list(
        session.scalars(
            select(FollowUp)
            .where(FollowUp.place_id == place_id)
            .order_by(FollowUp.done.asc(), FollowUp.scheduled_at.asc().nulls_last())
        )
    )


def complete_followup(session: Session, followup_id: int) -> FollowUp | None:
    fu = session.get(FollowUp, followup_id)
    if fu is None:
        return None
    fu.done = True
    fu.done_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(fu)
    return fu


def delete_followup(session: Session, followup_id: int) -> bool:
    fu = session.get(FollowUp, followup_id)
    if fu is None:
        return False
    session.delete(fu)
    session.commit()
    return True


def upcoming(session: Session, *, limit: int = 100) -> list[FollowUp]:
    """Agenda global: follow-ups pendentes de todos os leads, mais urgentes primeiro."""
    return list(
        session.scalars(
            select(FollowUp)
            .where(FollowUp.done.is_(False))
            .order_by(FollowUp.scheduled_at.asc().nulls_last())
            .limit(limit)
        )
    )
