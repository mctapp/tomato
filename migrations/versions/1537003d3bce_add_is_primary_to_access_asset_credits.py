"""add_is_primary_to_access_asset_credits

Revision ID: 1537003d3bce
Revises: d6725845db8d
Create Date: 2025-05-24 21:03:07.066011

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1537003d3bce'
down_revision = 'd6725845db8d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # is_primary 컬럼 추가 (기본값 False)
    op.add_column('access_asset_credits', 
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # 각 access_asset_id별로 가장 낮은 sequence_number를 가진 크레딧을 주 작업자로 설정
    op.execute("""
        UPDATE access_asset_credits
        SET is_primary = true
        WHERE (access_asset_id, sequence_number) IN (
            SELECT access_asset_id, MIN(sequence_number)
            FROM access_asset_credits
            GROUP BY access_asset_id
        )
    """)

def downgrade() -> None:
    op.drop_column('access_asset_credits', 'is_primary')
