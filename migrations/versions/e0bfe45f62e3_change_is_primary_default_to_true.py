"""change_is_primary_default_to_true

Revision ID: e0bfe45f62e3
Revises: 1537003d3bce
Create Date: 2025-05-24 23:48:10.462566

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e0bfe45f62e3'
down_revision = '1537003d3bce'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 기존 레코드들의 is_primary 값은 유지하면서 기본값만 변경
    op.alter_column('access_asset_credits', 'is_primary',
                    existing_type=sa.Boolean(),
                    server_default=sa.true(),
                    existing_nullable=False)


def downgrade() -> None:
    # 기본값을 다시 false로 변경
    op.alter_column('access_asset_credits', 'is_primary',
                    existing_type=sa.Boolean(),
                    server_default=sa.false(),
                    existing_nullable=False)
