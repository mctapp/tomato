"""add zero trust table

Revision ID: 099af98ec5c4
Revises: d043b8249af8
Create Date: 2025-06-19 13:56:49.089177

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '099af98ec5c4'
down_revision = 'd043b8249af8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # user_devices 테이블
    op.create_table('user_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(), nullable=False),
        sa.Column('device_fingerprint', sa.String(), nullable=False),
        sa.Column('device_name', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=False),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('browser', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('trust_score', sa.Float(), nullable=False),
        sa.Column('last_ip', sa.String(), nullable=False),
        sa.Column('last_country', sa.String(), nullable=True),
        sa.Column('last_city', sa.String(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('trusted_at', sa.DateTime(), nullable=True),
        sa.Column('blocked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_devices_device_id'), 'user_devices', ['device_id'], unique=True)
    op.create_index(op.f('ix_user_devices_user_id'), 'user_devices', ['user_id'], unique=False)
    
    # user_behavior_patterns 테이블
    op.create_table('user_behavior_patterns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('typical_hours', sa.String(), nullable=False),
        sa.Column('typical_days', sa.String(), nullable=False),
        sa.Column('typical_locations', sa.String(), nullable=False),
        sa.Column('avg_session_duration', sa.Integer(), nullable=False),
        sa.Column('avg_requests_per_session', sa.Integer(), nullable=False),
        sa.Column('common_endpoints', sa.String(), nullable=False),
        sa.Column('failed_login_count', sa.Integer(), nullable=False),
        sa.Column('anomaly_count', sa.Integer(), nullable=False),
        sa.Column('last_anomaly_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_behavior_patterns_user_id'), 'user_behavior_patterns', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_user_behavior_patterns_user_id'), table_name='user_behavior_patterns')
    op.drop_table('user_behavior_patterns')
    op.drop_index(op.f('ix_user_devices_user_id'), table_name='user_devices')
    op.drop_index(op.f('ix_user_devices_device_id'), table_name='user_devices')
    op.drop_table('user_devices')
