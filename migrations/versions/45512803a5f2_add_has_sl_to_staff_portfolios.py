"""add has_sl to staff_portfolios

Revision ID: 45512803a5f2
Revises: 29aacaae4755
Create Date: 2025-05-24 02:04:02.058572

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '45512803a5f2'
down_revision = '29aacaae4755'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # staff_portfolios 테이블에 has_sl 컬럼 추가
    op.add_column('staff_portfolios', sa.Column('has_sl', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # has_sl 컬럼 제거
    op.drop_column('staff_portfolios', 'has_sl')
