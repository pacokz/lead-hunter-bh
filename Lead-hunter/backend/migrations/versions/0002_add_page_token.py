"""add page_token to search_jobs

Revision ID: 0002_page_token
Revises: dfc1e5ac617e
Create Date: 2026-06-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_page_token"
down_revision: Union[str, None] = "dfc1e5ac617e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("search_jobs", sa.Column("page_token", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("search_jobs", "page_token")
