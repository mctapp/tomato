"""api_key_usage_logs

Revision ID: c36df35f4741
Revises: 8895adcd5d3a
Create Date: 2025-06-15 01:17:03.897136

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c36df35f4741'
down_revision = '8895adcd5d3a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Audit Logs 테이블
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('request_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=True),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('method', sa.String(), nullable=False),
        sa.Column('path', sa.String(), nullable=False),
        sa.Column('changes', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=False),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('country', sa.String(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=False, server_default='0'),
        sa.Column('anomaly_detected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('compliance_tags', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Audit logs 인덱스들
    op.create_index(op.f('ix_audit_logs_request_id'), 'audit_logs', ['request_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_session_id'), 'audit_logs', ['session_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index('idx_audit_timestamp_user', 'audit_logs', ['timestamp', 'user_id'], unique=False)
    op.create_index('idx_audit_action_resource', 'audit_logs', ['action', 'resource_type'], unique=False)
    
    # GIN 인덱스는 PostgreSQL 전용
    op.execute("CREATE INDEX idx_audit_compliance ON audit_logs USING gin (compliance_tags)")
    
    # Security Events 테이블
    op.create_table('security_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('action_taken', sa.String(), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Security events 인덱스들
    op.create_index(op.f('ix_security_events_event_type'), 'security_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_security_events_severity'), 'security_events', ['severity'], unique=False)
    op.create_index(op.f('ix_security_events_user_id'), 'security_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_security_events_ip_address'), 'security_events', ['ip_address'], unique=False)
    op.create_index('idx_security_timestamp_type', 'security_events', ['timestamp', 'event_type'], unique=False)
    op.create_index('idx_security_severity_resolved', 'security_events', ['severity', 'resolved'], unique=False)

def downgrade() -> None:
    # Security events 테이블 삭제
    op.drop_index('idx_security_severity_resolved', table_name='security_events')
    op.drop_index('idx_security_timestamp_type', table_name='security_events')
    op.drop_index(op.f('ix_security_events_ip_address'), table_name='security_events')
    op.drop_index(op.f('ix_security_events_user_id'), table_name='security_events')
    op.drop_index(op.f('ix_security_events_severity'), table_name='security_events')
    op.drop_index(op.f('ix_security_events_event_type'), table_name='security_events')
    op.drop_table('security_events')
    
    # Audit logs 테이블 삭제
    op.drop_index('idx_audit_compliance', table_name='audit_logs')
    op.drop_index('idx_audit_action_resource', table_name='audit_logs')
    op.drop_index('idx_audit_timestamp_user', table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_session_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_request_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
