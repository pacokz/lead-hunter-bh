from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.database import Base
from app.enums import CommercialStage, ContactChannel
from app.models.base import TimestampMixin


class CommercialPipeline(TimestampMixin, Base):
    __tablename__ = "commercial_pipeline"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    stage: Mapped[CommercialStage] = mapped_column(
        SAEnum(CommercialStage, name="commercial_stage"),
        default=CommercialStage.NOVO,
        nullable=False,
    )
    owner: Mapped[str | None] = mapped_column(String(120))


class OutreachDraft(TimestampMixin, Base):
    __tablename__ = "outreach_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[ContactChannel] = mapped_column(
        SAEnum(ContactChannel, name="contact_channel"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    demo_link: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT", nullable=False)


class Interaction(TimestampMixin, Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[ContactChannel | None] = mapped_column(
        SAEnum(ContactChannel, name="contact_channel")
    )
    direction: Mapped[str | None] = mapped_column(String(20))  # outbound | inbound
    content: Mapped[str | None] = mapped_column(Text)
    logged_by_samuel: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(120))  # operador (login Cloudflare Access)


class FollowUp(TimestampMixin, Base):
    __tablename__ = "follow_ups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(60), nullable=False)  # call | mensagem
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    note: Mapped[str | None] = mapped_column(Text)
    done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(120))  # operador (login Cloudflare Access)


class Opportunity(TimestampMixin, Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str] = mapped_column(
        ForeignKey("places.place_id", ondelete="CASCADE"), nullable=False
    )
    product: Mapped[str | None] = mapped_column(String(120))  # site | site+painel
    value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    stage: Mapped[str | None] = mapped_column(String(60))


class DoNotContact(TimestampMixin, Base):
    __tablename__ = "do_not_contact"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(60))
    reason: Mapped[str | None] = mapped_column(Text)
