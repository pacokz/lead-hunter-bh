from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import SiteClass
from app.models.base import TimestampMixin


class SiteAudit(TimestampMixin, Base):
    __tablename__ = "site_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    site_class: Mapped[SiteClass] = mapped_column(SAEnum(SiteClass, name="site_class"), nullable=False)
    https: Mapped[bool | None] = mapped_column(Boolean)
    responsive: Mapped[bool | None] = mapped_column(Boolean)
    http_status: Mapped[int | None] = mapped_column(Integer)
    final_url: Mapped[str | None] = mapped_column(Text)
    response_time_s: Mapped[float | None] = mapped_column(Float)
    title: Mapped[str | None] = mapped_column(Text)
    meta_description: Mapped[str | None] = mapped_column(Text)
    has_form: Mapped[bool | None] = mapped_column(Boolean)
    has_whatsapp: Mapped[bool | None] = mapped_column(Boolean)
    social_links: Mapped[list | None] = mapped_column(JSONB)


class SiteAuditIssue(Base):
    __tablename__ = "site_audit_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    audit_id: Mapped[int] = mapped_column(
        ForeignKey("site_audits.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(120), nullable=False)
    severity: Mapped[str | None] = mapped_column(String(40))
    description: Mapped[str | None] = mapped_column(Text)


class SiteScreenshot(Base):
    __tablename__ = "site_screenshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    audit_id: Mapped[int] = mapped_column(
        ForeignKey("site_audits.id", ondelete="CASCADE"), nullable=False
    )
    viewport: Mapped[str] = mapped_column(String(40), nullable=False)  # desktop | mobile
    path: Mapped[str] = mapped_column(Text, nullable=False)
