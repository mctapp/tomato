"""add_staff_management_tables

Revision ID: 3e3959b51ff4
Revises: 721797c55c0e
Create Date: 2025-05-24 01:15:27.427234

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3e3959b51ff4'
down_revision = '721797c55c0e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 스태프 기본 정보 테이블
    op.create_table('staffs',
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
    op.create_index(op.f('ix_staffs_id'), 'staffs', ['id'], unique=False)
    op.create_index(op.f('ix_staffs_name'), 'staffs', ['name'], unique=False)

    # 스태프 역할 테이블
    op.create_table('staff_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_type', sa.String(), nullable=False),
        sa.Column('role_other', sa.String(), nullable=True),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['staff_id'], ['staffs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_roles_role_type'), 'staff_roles', ['role_type'], unique=False)
    op.create_index(op.f('ix_staff_roles_staff_id'), 'staff_roles', ['staff_id'], unique=False)

    # 스태프 전문영역 테이블
    op.create_table('staff_expertise',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('expertise_field', sa.String(), nullable=False),
        sa.Column('expertise_field_other', sa.String(), nullable=True),
        sa.Column('skill_grade', sa.Integer(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['staff_id'], ['staffs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_expertise_expertise_field'), 'staff_expertise', ['expertise_field'], unique=False)
    op.create_index(op.f('ix_staff_expertise_staff_id'), 'staff_expertise', ['staff_id'], unique=False)

    # 스태프 작업로그 테이블
    op.create_table('staff_work_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_title', sa.String(), nullable=False),
        sa.Column('work_year_month', sa.String(), nullable=False),  # YYYY-MM 형식
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['staff_id'], ['staffs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_work_logs_staff_id'), 'staff_work_logs', ['staff_id'], unique=False)

    # 스태프 대표작 테이블
    op.create_table('staff_portfolios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_title', sa.String(), nullable=False),
        sa.Column('director_name', sa.String(), nullable=True),
        sa.Column('work_year', sa.Integer(), nullable=True),
        sa.Column('has_ad', sa.Boolean(), nullable=False, default=False),
        sa.Column('has_cc', sa.Boolean(), nullable=False, default=False),
        sa.Column('reference_url', sa.String(), nullable=True),
        sa.Column('participation_content', sa.Text(), nullable=True),
        sa.Column('poster_image', sa.String(), nullable=True),  # S3 public
        sa.Column('credit_image', sa.String(), nullable=True),  # S3 private
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['staff_id'], ['staffs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_portfolios_staff_id'), 'staff_portfolios', ['staff_id'], unique=False)

    # access_asset_credits 테이블에 staff_id 컬럼 추가 (기존 테이블 수정)
    op.add_column('access_asset_credits', sa.Column('staff_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_access_asset_credits_staff_id', 'access_asset_credits', 'staffs', ['staff_id'], ['id'])
    op.create_index(op.f('ix_access_asset_credits_staff_id'), 'access_asset_credits', ['staff_id'], unique=False)


def downgrade() -> None:
    # access_asset_credits 테이블에서 staff_id 관련 제거
    op.drop_index(op.f('ix_access_asset_credits_staff_id'), table_name='access_asset_credits')
    op.drop_constraint('fk_access_asset_credits_staff_id', 'access_asset_credits', type_='foreignkey')
    op.drop_column('access_asset_credits', 'staff_id')
    
    op.drop_index(op.f('ix_staff_portfolios_staff_id'), table_name='staff_portfolios')
    op.drop_table('staff_portfolios')
    op.drop_index(op.f('ix_staff_work_logs_staff_id'), table_name='staff_work_logs')
    op.drop_table('staff_work_logs')
    op.drop_index(op.f('ix_staff_expertise_staff_id'), table_name='staff_expertise')
    op.drop_index(op.f('ix_staff_expertise_expertise_field'), table_name='staff_expertise')
    op.drop_table('staff_expertise')
    op.drop_index(op.f('ix_staff_roles_staff_id'), table_name='staff_roles')
    op.drop_index(op.f('ix_staff_roles_role_type'), table_name='staff_roles')
    op.drop_table('staff_roles')
    op.drop_index(op.f('ix_staffs_name'), table_name='staffs')
    op.drop_index(op.f('ix_staffs_id'), table_name='staffs')
    op.drop_table('staffs')
