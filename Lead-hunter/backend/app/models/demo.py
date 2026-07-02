from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class DemoProject(TimestampMixin, Base):
    __tablename__ = "demo_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(40), default="PENDING", nullable=False)
    reference_used: Mapped[str | None] = mapped_column(Text)
    slug: Mapped[str | None] = mapped_column(String(160), index=True)
    published_url: Mapped[str | None] = mapped_column(Text)


class DemoVersion(TimestampMixin, Base):
    __tablename__ = "demo_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    demo_id: Mapped[int] = mapped_column(
        ForeignKey("demo_projects.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    html_path: Mapped[str | None] = mapped_column(Text)
    generated_by: Mapped[str | None] = mapped_column(String(120))


class DemoRequest(TimestampMixin, Base):
    """Pedido de demo feito pela interface (botão GERAR SITE).

    Status: PENDING → IN_PROGRESS (agente pegou) → PUBLISHED (demo no ar,
    marcado pelo /demos/register) | CANCELLED.
    """

    __tablename__ = "demo_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(40), default="PENDING", nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(120))


class DemoReview(TimestampMixin, Base):
    __tablename__ = "demo_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    demo_id: Mapped[int] = mapped_column(
        ForeignKey("demo_projects.id", ondelete="CASCADE"), nullable=False
    )
    approved_by_samuel: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
