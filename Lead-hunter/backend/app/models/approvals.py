from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import ApprovalStatus, ApprovalType
from app.models.base import TimestampMixin


class Approval(TimestampMixin, Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[ApprovalType] = mapped_column(
        SAEnum(ApprovalType, name="approval_type"), nullable=False
    )
    status: Mapped[ApprovalStatus] = mapped_column(
        SAEnum(ApprovalStatus, name="approval_status"),
        default=ApprovalStatus.PENDING,
        nullable=False,
    )
    context: Mapped[dict | None] = mapped_column(JSONB)
    decided_by: Mapped[str | None] = mapped_column(String(120))


class ApprovalEvent(TimestampMixin, Base):
    __tablename__ = "approval_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    approval_id: Mapped[int] = mapped_column(
        ForeignKey("approvals.id", ondelete="CASCADE"), nullable=False
    )
    event: Mapped[str] = mapped_column(String(120), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text)
