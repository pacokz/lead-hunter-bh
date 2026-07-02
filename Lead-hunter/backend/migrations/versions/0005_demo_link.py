"""vínculo demo→lead: slug e published_url em demo_projects

Revision ID: 0005_demo_link
Revises: 0004_created_by
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_demo_link"
down_revision: Union[str, None] = "0004_created_by"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("demo_projects", sa.Column("slug", sa.String(160), nullable=True))
    op.add_column("demo_projects", sa.Column("published_url", sa.Text(), nullable=True))
    op.create_index("ix_demo_projects_slug", "demo_projects", ["slug"])


def downgrade() -> None:
    op.drop_index("ix_demo_projects_slug", table_name="demo_projects")
    op.drop_column("demo_projects", "published_url")
    op.drop_column("demo_projects", "slug")
