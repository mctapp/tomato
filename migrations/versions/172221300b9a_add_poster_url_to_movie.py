"""add_poster_url_to_movie

Revision ID: 172221300b9a
Revises: ac1eb0107b20
Create Date: 2025-11-24 14:33:19.344442

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '172221300b9a'
down_revision = 'ac1eb0107b20'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add poster_url column to movie table
    op.add_column('movie', sa.Column('poster_url', sa.String(length=500), nullable=True))

    # Optional: Populate poster_url for existing records
    # This requires fetching S3 URLs from file_assets table
    # Uncomment if you want to migrate existing data:
    #
    # op.execute("""
    #     UPDATE movie m
    #     SET poster_url = (
    #         SELECT CONCAT(
    #             'https://',
    #             CASE
    #                 WHEN fa.is_public THEN 'tomato-public'
    #                 ELSE 'tomato-private'
    #             END,
    #             '.s3.ap-northeast-2.amazonaws.com/',
    #             fa.s3_key
    #         )
    #         FROM file_assets fa
    #         WHERE fa.id = m.poster_file_id
    #           AND fa.status = 'active'
    #           AND fa.is_public = true
    #     )
    #     WHERE m.poster_file_id IS NOT NULL
    #       AND m.poster_url IS NULL
    # """)


def downgrade() -> None:
    # Remove poster_url column from movie table
    op.drop_column('movie', 'poster_url')
