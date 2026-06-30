"""follow_ups: add note, done, done_at

Revision ID: 0003_followup_fields
Revises: 0002_page_token
Create Date: 2026-06-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_followup_fields"
down_revision: Union[str, None] = "0002_page_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("follow_ups", sa.Column("note", sa.Text(), nullable=True))
    op.add_column(
        "follow_ups",
        sa.Column("done", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("follow_ups", sa.Column("done_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("follow_ups", "done_at")
    op.drop_column("follow_ups", "done")
    op.drop_column("follow_ups", "note")
