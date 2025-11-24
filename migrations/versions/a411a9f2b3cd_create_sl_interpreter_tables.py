"""create_sl_interpreter_tables

Revision ID: a411a9f2b3cd
Revises: c99aee85cf1e
Create Date: 2025-05-22 16:18:26.708894

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a411a9f2b3cd'
down_revision = 'c99aee85cf1e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SL Interpreters 메인 테이블
    op.create_table('sl_interpreters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('location', sa.String(length=100), nullable=True),
        sa.Column('skill_level', sa.Integer(), nullable=True),
        sa.Column('profile_image', sa.String(length=500), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('skill_level >= 1 AND skill_level <= 9', name='check_skill_level_range'),
        sa.CheckConstraint("gender IN ('male', 'female', 'other', 'prefer_not_to_say')", name='check_gender_values')
    )
    op.create_index(op.f('ix_sl_interpreters_name'), 'sl_interpreters', ['name'], unique=False)
    op.create_index(op.f('ix_sl_interpreters_skill_level'), 'sl_interpreters', ['skill_level'], unique=False)
    op.create_index(op.f('ix_sl_interpreters_created_at'), 'sl_interpreters', ['created_at'], unique=False)
    
    # 사용수어 테이블
    op.create_table('sl_interpreter_sign_languages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sign_language_code', sa.String(length=10), nullable=False),
        sa.Column('proficiency_level', sa.Integer(), nullable=False),
        sa.Column('sl_interpreter_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['sl_interpreter_id'], ['sl_interpreters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('proficiency_level >= 1 AND proficiency_level <= 9', name='check_proficiency_level_range'),
        sa.CheckConstraint("sign_language_code IN ('KSL', 'ASL', 'VSL', 'JSL', 'CSL', 'BSL', 'FSL', 'GSL', 'ISL', 'SSL', 'RSL')", name='check_sign_language_codes')
    )
    op.create_index(op.f('ix_sl_interpreter_sign_languages_sl_interpreter_id'), 'sl_interpreter_sign_languages', ['sl_interpreter_id'], unique=False)
    op.create_index(op.f('ix_sl_interpreter_sign_languages_sign_language_code'), 'sl_interpreter_sign_languages', ['sign_language_code'], unique=False)
    
    # 전문영역 테이블
    op.create_table('sl_interpreter_expertise',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('expertise_field', sa.String(length=50), nullable=False),
        sa.Column('expertise_field_other', sa.String(length=255), nullable=True),
        sa.Column('skill_grade', sa.Integer(), nullable=False),
        sa.Column('sl_interpreter_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['sl_interpreter_id'], ['sl_interpreters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('skill_grade >= 1 AND skill_grade <= 9', name='check_skill_grade_range'),
        sa.CheckConstraint("expertise_field IN ('movie', 'video', 'theater', 'performance', 'other')", name='check_expertise_field_values')
    )
    op.create_index(op.f('ix_sl_interpreter_expertise_sl_interpreter_id'), 'sl_interpreter_expertise', ['sl_interpreter_id'], unique=False)
    op.create_index(op.f('ix_sl_interpreter_expertise_expertise_field'), 'sl_interpreter_expertise', ['expertise_field'], unique=False)
    
    # 샘플 테이블
    op.create_table('sl_interpreter_samples',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('sample_type', sa.String(length=10), nullable=False),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_type', sa.String(length=10), nullable=True),
        sa.Column('sl_interpreter_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['sl_interpreter_id'], ['sl_interpreters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('sequence_number >= 1 AND sequence_number <= 5', name='check_sequence_number_range'),
        sa.CheckConstraint("sample_type IN ('video', 'image')", name='check_sample_type_values')
    )
    op.create_index(op.f('ix_sl_interpreter_samples_sl_interpreter_id'), 'sl_interpreter_samples', ['sl_interpreter_id'], unique=False)
    op.create_index(op.f('ix_sl_interpreter_samples_sample_type'), 'sl_interpreter_samples', ['sample_type'], unique=False)
    
    # 복합 인덱스 추가 (성능 최적화)
    op.create_index('ix_sl_interpreter_samples_composite', 'sl_interpreter_samples', ['sl_interpreter_id', 'sample_type'], unique=False)
    op.create_index('ix_sl_interpreter_sign_languages_composite', 'sl_interpreter_sign_languages', ['sl_interpreter_id', 'sign_language_code'], unique=False)
    
    # 유니크 제약조건 추가
    op.create_unique_constraint('uq_sl_interpreter_samples_sequence', 'sl_interpreter_samples', ['sl_interpreter_id', 'sample_type', 'sequence_number'])


def downgrade() -> None:
    op.drop_table('sl_interpreter_samples')
    op.drop_table('sl_interpreter_expertise')
    op.drop_table('sl_interpreter_sign_languages')
    op.drop_table('sl_interpreters')
