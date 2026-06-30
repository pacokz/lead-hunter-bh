"""Camada única de escrita de logs operacionais e de erro.

Agentes e serviços registram aqui — nunca com SQL direto.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.agents import AgentError, OperationLog


def log_operation(
    session: Session,
    action: str,
    *,
    agent_id: int | None = None,
    place_id: str | None = None,
    payload: dict | None = None,
) -> OperationLog:
    entry = OperationLog(action=action, agent_id=agent_id, place_id=place_id, payload=payload)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def log_error(
    session: Session,
    message: str,
    *,
    agent_id: int | None = None,
    task_id: int | None = None,
    stack: str | None = None,
) -> AgentError:
    entry = AgentError(message=message, agent_id=agent_id, task_id=task_id, stack=stack)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
