from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class ClientDiagnostic(TimestampMixin, Base):
    __tablename__ = "client_diagnostics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    operation_context: Mapped[str | None] = mapped_column(Text)
    processes: Mapped[list | None] = mapped_column(JSONB)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AutomationOpportunity(TimestampMixin, Base):
    __tablename__ = "automation_opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    diagnostic_id: Mapped[int] = mapped_column(
        ForeignKey("client_diagnostics.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_impact: Mapped[str | None] = mapped_column(String(120))
    effort: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(40), default="IDENTIFIED", nullable=False)
