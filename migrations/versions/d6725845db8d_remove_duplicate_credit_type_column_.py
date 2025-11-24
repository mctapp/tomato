"""Remove duplicate credit_type column from access_asset_credits

Revision ID: d6725845db8d
Revises: a19f5daf83a3
Create Date: 2025-05-24 12:19:27.531346

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd6725845db8d'
down_revision = 'a19f5daf83a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index('ix_access_asset_credits_credit_type', table_name='access_asset_credits')
    op.drop_column('access_asset_credits', 'credit_type')

def downgrade() -> None:
    op.add_column('access_asset_credits', 
        sa.Column('credit_type', sa.String(20), nullable=False)
    )
    op.create_index('ix_access_asset_credits_credit_type', 'access_asset_credits', ['credit_type'])
