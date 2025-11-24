"""add_is_pinned_to_production_projects

Revision ID: ac1eb0107b20
Revises: dbe521559d39
Create Date: 2025-06-04 20:21:30.353152

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ac1eb0107b20'
down_revision = 'dbe521559d39'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('production_projects', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'))

def downgrade() -> None:
    op.drop_column('production_projects', 'is_pinned')
