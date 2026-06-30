from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class DesignReference(TimestampMixin, Base):
    __tablename__ = "design_references"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    ref_url: Mapped[str] = mapped_column(Text, nullable=False)
    patterns: Mapped[dict | None] = mapped_column(JSONB)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
