"""add memo to access asset credits

Revision ID: a19f5daf83a3
Revises: 45512803a5f2
Create Date: 2025-05-24 10:50:12.864410

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a19f5daf83a3'
down_revision = '45512803a5f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # access_asset_credits 테이블에 memo 필드 추가
    op.add_column('access_asset_credits', 
        sa.Column('memo', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    # memo 필드 제거
    op.drop_column('access_asset_credits', 'memo')
