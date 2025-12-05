"""Add production_year to movie table

Revision ID: add_production_year
Revises: f90801b534dd
Create Date: 2025-12-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_production_year'
down_revision = 'f90801b534dd'
branch_labels = None
depends_on = None


def upgrade():
    # Add production_year column to movie table
    op.add_column('movie', sa.Column('production_year', sa.Integer(), nullable=True))


def downgrade():
    # Remove production_year column from movie table
    op.drop_column('movie', 'production_year')
