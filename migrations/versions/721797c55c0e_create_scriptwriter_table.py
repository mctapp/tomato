"""Create scriptwriter table

Revision ID: 721797c55c0e
Revises: a411a9f2b3cd
Create Date: 2025-05-23 20:22:06.497838

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '721797c55c0e'
down_revision = 'a411a9f2b3cd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 해설작가 기본 정보 테이블
    op.create_table('scriptwriters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('skill_level', sa.Integer(), nullable=True),
        sa.Column('profile_image', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scriptwriters_id'), 'scriptwriters', ['id'], unique=False)
    op.create_index(op.f('ix_scriptwriters_name'), 'scriptwriters', ['name'], unique=False)

    # 해설작가 사용언어 테이블
    op.create_table('scriptwriter_languages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('language_code', sa.String(), nullable=False),
        sa.Column('proficiency_level', sa.Integer(), nullable=False),
        sa.Column('scriptwriter_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scriptwriter_id'], ['scriptwriters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scriptwriter_languages_language_code'), 'scriptwriter_languages', ['language_code'], unique=False)
    op.create_index(op.f('ix_scriptwriter_languages_scriptwriter_id'), 'scriptwriter_languages', ['scriptwriter_id'], unique=False)

    # 해설작가 해설분야 테이블 (AD/CC)
    op.create_table('scriptwriter_specialties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('specialty_type', sa.String(), nullable=False),  # 'AD' or 'CC'
        sa.Column('skill_grade', sa.Integer(), nullable=False),
        sa.Column('scriptwriter_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scriptwriter_id'], ['scriptwriters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scriptwriter_specialties_specialty_type'), 'scriptwriter_specialties', ['specialty_type'], unique=False)
    op.create_index(op.f('ix_scriptwriter_specialties_scriptwriter_id'), 'scriptwriter_specialties', ['scriptwriter_id'], unique=False)

    # 해설작가 작업로그 테이블
    op.create_table('scriptwriter_work_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_title', sa.String(), nullable=False),
        sa.Column('work_year_month', sa.String(), nullable=False),  # YYYY-MM 형식
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('scriptwriter_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scriptwriter_id'], ['scriptwriters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scriptwriter_work_logs_scriptwriter_id'), 'scriptwriter_work_logs', ['scriptwriter_id'], unique=False)

    # 해설작가 대표해설 테이블
    op.create_table('scriptwriter_samples',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_title', sa.String(), nullable=False),
        sa.Column('director_name', sa.String(), nullable=True),
        sa.Column('work_year', sa.Integer(), nullable=True),
        sa.Column('has_ad', sa.Boolean(), nullable=False, default=False),
        sa.Column('has_cc', sa.Boolean(), nullable=False, default=False),
        sa.Column('timecode_in', sa.String(), nullable=True),
        sa.Column('timecode_out', sa.String(), nullable=True),
        sa.Column('reference_url', sa.String(), nullable=True),
        sa.Column('narration_content', sa.Text(), nullable=True),
        sa.Column('narration_memo', sa.Text(), nullable=True),
        sa.Column('poster_image', sa.String(), nullable=True),  # S3 public
        sa.Column('reference_image', sa.String(), nullable=True),  # S3 private
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('scriptwriter_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scriptwriter_id'], ['scriptwriters.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scriptwriter_samples_scriptwriter_id'), 'scriptwriter_samples', ['scriptwriter_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_scriptwriter_samples_scriptwriter_id'), table_name='scriptwriter_samples')
    op.drop_table('scriptwriter_samples')
    op.drop_index(op.f('ix_scriptwriter_work_logs_scriptwriter_id'), table_name='scriptwriter_work_logs')
    op.drop_table('scriptwriter_work_logs')
    op.drop_index(op.f('ix_scriptwriter_specialties_scriptwriter_id'), table_name='scriptwriter_specialties')
    op.drop_index(op.f('ix_scriptwriter_specialties_specialty_type'), table_name='scriptwriter_specialties')
    op.drop_table('scriptwriter_specialties')
    op.drop_index(op.f('ix_scriptwriter_languages_scriptwriter_id'), table_name='scriptwriter_languages')
    op.drop_index(op.f('ix_scriptwriter_languages_language_code'), table_name='scriptwriter_languages')
    op.drop_table('scriptwriter_languages')
    op.drop_index(op.f('ix_scriptwriters_name'), table_name='scriptwriters')
    op.drop_index(op.f('ix_scriptwriters_id'), table_name='scriptwriters')
    op.drop_table('scriptwriters')
