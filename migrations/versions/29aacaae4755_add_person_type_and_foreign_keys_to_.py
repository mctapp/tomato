"""add_person_type_and_foreign_keys_to_access_asset_credits

Revision ID: 29aacaae4755
Revises: 3e3959b51ff4
Create Date: 2025-05-24 01:32:52.044908

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '29aacaae4755'
down_revision = '3e3959b51ff4'
branch_labels = None
depends_on = None


# Alembic Migration File

"""add_person_type_and_foreign_keys_to_access_asset_credits

Revision ID: 29aacaae4755
Revises: 3e3959b51ff4
Create Date: 2025-05-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '29aacaae4755'
down_revision = '3e3959b51ff4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. person_type 컬럼 추가
    op.add_column('access_asset_credits', 
        sa.Column('person_type', sa.String(), nullable=False, server_default='staff')
    )
    
    # 2. 기본값 제거
    op.alter_column('access_asset_credits', 'person_type',
        server_default=None
    )
    
    # 3. person_type에 대한 체크 제약 조건 추가
    op.create_check_constraint(
        'check_person_type',
        'access_asset_credits',
        "person_type IN ('scriptwriter', 'voice_artist', 'sl_interpreter', 'staff')"
    )
    
    # 4. staff_id는 이미 존재하므로 나머지 person_type별 외래키 컬럼만 추가
    op.add_column('access_asset_credits', 
        sa.Column('scriptwriter_id', sa.Integer(), nullable=True)
    )
    op.add_column('access_asset_credits', 
        sa.Column('voice_artist_id', sa.Integer(), nullable=True)
    )
    op.add_column('access_asset_credits', 
        sa.Column('sl_interpreter_id', sa.Integer(), nullable=True)
    )
    
    # 5. 외래키 제약 조건 추가 (staff_id는 이미 있으므로 제외)
    op.create_foreign_key(
        'fk_access_asset_credits_scriptwriter_id',
        'access_asset_credits',
        'scriptwriters',
        ['scriptwriter_id'],
        ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_access_asset_credits_voice_artist_id',
        'access_asset_credits',
        'voice_artists',
        ['voice_artist_id'],
        ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_access_asset_credits_sl_interpreter_id',
        'access_asset_credits',
        'sl_interpreters',
        ['sl_interpreter_id'],
        ['id'],
        ondelete='CASCADE'
    )
    
    # 6. 인덱스 추가 (staff_id 인덱스는 이미 있으므로 제외)
    op.create_index('idx_access_asset_credits_person_type', 'access_asset_credits', ['person_type'])
    op.create_index('idx_access_asset_credits_scriptwriter_id', 'access_asset_credits', ['scriptwriter_id'])
    op.create_index('idx_access_asset_credits_voice_artist_id', 'access_asset_credits', ['voice_artist_id'])
    op.create_index('idx_access_asset_credits_sl_interpreter_id', 'access_asset_credits', ['sl_interpreter_id'])
    
    # 7. 기존 데이터 마이그레이션 - 모든 기존 레코드를 staff로 설정
    op.execute("UPDATE access_asset_credits SET person_type = 'staff' WHERE person_type IS NULL")
    
    # 8. 기존 person_id 값을 staff_id로 복사 (만약 필요하다면)
    op.execute("UPDATE access_asset_credits SET staff_id = person_id WHERE person_type = 'staff' AND staff_id IS NULL")


def downgrade() -> None:
    # 인덱스 제거
    op.drop_index('idx_access_asset_credits_sl_interpreter_id', table_name='access_asset_credits')
    op.drop_index('idx_access_asset_credits_voice_artist_id', table_name='access_asset_credits')
    op.drop_index('idx_access_asset_credits_scriptwriter_id', table_name='access_asset_credits')
    op.drop_index('idx_access_asset_credits_person_type', table_name='access_asset_credits')
    
    # 외래키 제거
    op.drop_constraint('fk_access_asset_credits_sl_interpreter_id', 'access_asset_credits', type_='foreignkey')
    op.drop_constraint('fk_access_asset_credits_voice_artist_id', 'access_asset_credits', type_='foreignkey')
    op.drop_constraint('fk_access_asset_credits_scriptwriter_id', 'access_asset_credits', type_='foreignkey')
    
    # 컬럼 제거
    op.drop_column('access_asset_credits', 'sl_interpreter_id')
    op.drop_column('access_asset_credits', 'voice_artist_id')
    op.drop_column('access_asset_credits', 'scriptwriter_id')
    
    # 체크 제약 조건 제거
    op.drop_constraint('check_person_type', 'access_asset_credits', type_='check')
    
    # person_type 컬럼 제거
    op.drop_column('access_asset_credits', 'person_type')
