"""add mfa fields to users

Revision ID: d043b8249af8
Revises: be6a79235fd0
Create Date: 2025-06-17 17:53:19.572772

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd043b8249af8'
down_revision = 'be6a79235fd0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # MFA 타입 enum 생성
    op.execute("CREATE TYPE mfa_type AS ENUM ('NONE', 'TOTP', 'SMS', 'EMAIL')")
    
    # MFA 관련 컬럼 추가
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('mfa_type', sa.Enum('NONE', 'TOTP', 'SMS', 'EMAIL', name='mfa_type'), nullable=False, server_default='NONE'))
    op.add_column('users', sa.Column('mfa_secret', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('mfa_backup_codes', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('mfa_phone_number', sa.String(length=20), nullable=True))
    
    # 기본값 제거 (선택사항)
    op.alter_column('users', 'mfa_enabled', server_default=None)
    op.alter_column('users', 'mfa_type', server_default=None)


def downgrade() -> None:
    # 컬럼 삭제
    op.drop_column('users', 'mfa_phone_number')
    op.drop_column('users', 'mfa_backup_codes')
    op.drop_column('users', 'mfa_secret')
    op.drop_column('users', 'mfa_type')
    op.drop_column('users', 'mfa_enabled')
    
    # Enum 타입 삭제
    op.execute("DROP TYPE mfa_type")
