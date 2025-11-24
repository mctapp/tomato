"""create_api_keys_tables

Revision ID: 5de60035a5d4
Revises: f90801b534dd
Create Date: 2025-06-15 00:21:49.234652

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5de60035a5d4'
down_revision = 'f90801b534dd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # API 키 테이블 생성
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('key_prefix', sa.String(length=255), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('key_type', sa.Enum('personal', 'service', 'integration', 'testing', name='apikeytype'), nullable=False),
        sa.Column('status', sa.Enum('active', 'revoked', 'expired', 'suspended', name='apikeystatus'), nullable=False, server_default='active'),
        sa.Column('scopes', sa.Text(), nullable=False),
        sa.Column('allowed_ips', sa.Text(), nullable=True),
        sa.Column('allowed_origins', sa.Text(), nullable=True),
        sa.Column('rate_limit_per_minute', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('rate_limit_per_day', sa.Integer(), nullable=True),
        sa.Column('max_requests', sa.Integer(), nullable=True),
        sa.Column('request_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_ip', sa.String(length=255), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_keys_key_hash'), 'api_keys', ['key_hash'], unique=True)
    op.create_index(op.f('ix_api_keys_key_prefix'), 'api_keys', ['key_prefix'], unique=False)
    op.create_index(op.f('ix_api_keys_user_id'), 'api_keys', ['user_id'], unique=False)

    # API 키 사용 로그 테이블
    op.create_table(
        'api_key_usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.String(length=255), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('ip_address', sa.String(length=255), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('origin', sa.String(length=255), nullable=True),
        sa.Column('request_id', sa.String(length=255), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_key_usage_logs_api_key_id'), 'api_key_usage_logs', ['api_key_id'], unique=False)
    op.create_index(op.f('ix_api_key_usage_logs_timestamp'), 'api_key_usage_logs', ['timestamp'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_api_key_usage_logs_timestamp'), table_name='api_key_usage_logs')
    op.drop_index(op.f('ix_api_key_usage_logs_api_key_id'), table_name='api_key_usage_logs')
    op.drop_table('api_key_usage_logs')
    op.drop_index(op.f('ix_api_keys_user_id'), table_name='api_keys')
    op.drop_index(op.f('ix_api_keys_key_prefix'), table_name='api_keys')
    op.drop_index(op.f('ix_api_keys_key_hash'), table_name='api_keys')
    op.drop_table('api_keys')
    op.execute('DROP TYPE IF EXISTS apikeystatus')
    op.execute('DROP TYPE IF EXISTS apikeytype')
