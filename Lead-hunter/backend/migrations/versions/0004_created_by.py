"""atribuição de operador: created_by em interactions e follow_ups

Revision ID: 0004_created_by
Revises: 0003_followup_fields
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_created_by"
down_revision: Union[str, None] = "0003_followup_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interactions", sa.Column("created_by", sa.String(120), nullable=True))
    op.add_column("follow_ups", sa.Column("created_by", sa.String(120), nullable=True))


def downgrade() -> None:
    op.drop_column("follow_ups", "created_by")
    op.drop_column("interactions", "created_by")
