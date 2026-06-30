from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import PipelineState, ScoreBand
from app.models.base import TimestampMixin


class LeadPipeline(TimestampMixin, Base):
    __tablename__ = "lead_pipeline"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    state: Mapped[PipelineState] = mapped_column(
        SAEnum(PipelineState, name="pipeline_state"),
        default=PipelineState.DISCOVERED,
        nullable=False,
    )


class LeadScore(TimestampMixin, Base):
    __tablename__ = "lead_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    band: Mapped[ScoreBand] = mapped_column(SAEnum(ScoreBand, name="score_band"), nullable=False)
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LeadScoreComponent(Base):
    __tablename__ = "lead_score_components"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    score_id: Mapped[int] = mapped_column(
        ForeignKey("lead_scores.id", ondelete="CASCADE"), nullable=False
    )
    component: Mapped[str] = mapped_column(String(120), nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    value: Mapped[float] = mapped_column(Float, default=0, nullable=False)
