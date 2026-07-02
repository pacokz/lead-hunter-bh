"""pedidos de demo (botão GERAR SITE na interface)

Revision ID: 0006_demo_requests
Revises: 0005_demo_link
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_demo_requests"
down_revision: Union[str, None] = "0005_demo_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demo_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "place_id",
            sa.String(255),
            sa.ForeignKey("places.place_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(40), nullable=False, server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_demo_requests_place_id", "demo_requests", ["place_id"])
    op.create_index("ix_demo_requests_status", "demo_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_demo_requests_status", table_name="demo_requests")
    op.drop_index("ix_demo_requests_place_id", table_name="demo_requests")
    op.drop_table("demo_requests")
