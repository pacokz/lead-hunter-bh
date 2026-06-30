from datetime import date, datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import CampaignStatus, JobStatus
from app.models.base import TimestampMixin


class SearchCampaign(TimestampMixin, Base):
    __tablename__ = "search_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120))
    terms: Mapped[list | None] = mapped_column(JSONB)
    regions: Mapped[list | None] = mapped_column(JSONB)
    min_rating: Mapped[float | None] = mapped_column(Float)
    min_reviews: Mapped[int | None] = mapped_column(Integer)
    max_pages: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_calls: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[CampaignStatus] = mapped_column(
        SAEnum(CampaignStatus, name="campaign_status"),
        default=CampaignStatus.DRAFT,
        nullable=False,
    )


class SearchJob(TimestampMixin, Base):
    __tablename__ = "search_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("search_campaigns.id", ondelete="CASCADE"), nullable=False
    )
    term: Mapped[str] = mapped_column(String(200), nullable=False)
    region: Mapped[str] = mapped_column(String(120), nullable=False)
    page: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    page_token: Mapped[str | None] = mapped_column(Text)
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus, name="job_status"), default=JobStatus.PENDING, nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    results_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ApiUsage(TimestampMixin, Base):
    __tablename__ = "api_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(120), nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Numeric(10, 4), default=0, nullable=False)
    day: Mapped[date] = mapped_column(nullable=False)
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    campaign_id: Mapped[int | None] = mapped_column(
        ForeignKey("search_campaigns.id", ondelete="SET NULL")
    )


class Place(TimestampMixin, Base):
    __tablename__ = "places"

    place_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120))
    primary_type: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(60))
    website: Mapped[str | None] = mapped_column(Text)
    rating: Mapped[float | None] = mapped_column(Float)
    reviews_count: Mapped[int | None] = mapped_column(Integer)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    business_status: Mapped[str | None] = mapped_column(String(60))
    instagram_handle: Mapped[str | None] = mapped_column(String(120))
    google_maps_uri: Mapped[str | None] = mapped_column(Text)
