"""production_migration

Revision ID: ba1ba208e479
Revises: e0bfe45f62e3
Create Date: 2025-06-01 01:03:58.344447

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ba1ba208e479'
down_revision = 'e0bfe45f62e3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """접근성 미디어 제작 관리 시스템 통합 마이그레이션"""
    
    # ═══════════════════════════════════════════════════════════════════════
    # 1. PRODUCTION_PROJECTS 테이블 생성
    # ═══════════════════════════════════════════════════════════════════════
    op.create_table(
        'production_projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_asset_id', sa.Integer(), nullable=False),
        sa.Column('auto_created', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('credits_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('creation_trigger', sa.String(), nullable=True),
        sa.Column('current_stage', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('project_status', sa.String(), nullable=False, server_default="'active'"),
        sa.Column('progress_percentage', sa.DECIMAL(5,2), nullable=False, server_default='0.0'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('estimated_completion_date', sa.Date(), nullable=True),
        sa.Column('actual_completion_date', sa.Date(), nullable=True),
        sa.Column('work_speed_type', sa.String(1), nullable=False, server_default="'B'"),
        sa.Column('priority_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('access_asset_id'),
        sa.ForeignKeyConstraint(['access_asset_id'], ['access_assets.id'], ondelete='CASCADE')
    )
    
    # production_projects 제약조건 추가
    op.create_check_constraint(
        'check_work_speed_type',
        'production_projects',
        "work_speed_type IN ('A', 'B', 'C')"
    )
    
    op.create_check_constraint(
        'check_project_status',
        'production_projects',
        "project_status IN ('active', 'completed', 'paused', 'cancelled')"
    )
    
    op.create_check_constraint(
        'check_current_stage',
        'production_projects',
        "current_stage IN (1, 2, 3, 4)"
    )
    
    op.create_check_constraint(
        'check_creation_trigger',
        'production_projects',
        "creation_trigger IS NULL OR creation_trigger IN ('status_change', 'credits_sufficient', 'manual')"
    )
    
    # production_projects 인덱스 생성
    op.create_index(op.f('ix_production_projects_access_asset_id'), 'production_projects', ['access_asset_id'], unique=False)
    op.create_index('idx_production_projects_stage', 'production_projects', ['current_stage', 'priority_order'], unique=False)
    op.create_index('idx_production_projects_status', 'production_projects', ['project_status'], unique=False)
    op.create_index('idx_production_projects_speed', 'production_projects', ['work_speed_type'], unique=False)
    op.create_index('idx_production_projects_status_stage', 'production_projects', ['project_status', 'current_stage'], unique=False)

    # ═══════════════════════════════════════════════════════════════════════
    # 2. PRODUCTION_TASKS 테이블 생성
    # ═══════════════════════════════════════════════════════════════════════
    op.create_table(
        'production_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('production_project_id', sa.Integer(), nullable=False),
        sa.Column('stage_number', sa.Integer(), nullable=False),
        sa.Column('task_name', sa.String(length=100), nullable=False),
        sa.Column('task_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('task_status', sa.String(), nullable=False, server_default="'pending'"),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('assigned_credit_id', sa.Integer(), nullable=True),
        sa.Column('planned_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('planned_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('planned_hours', sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column('actual_hours', sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column('review_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reviewer_credit_id', sa.Integer(), nullable=True),
        sa.Column('review_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_hours', sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column('monitoring_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('monitor_credit_id', sa.Integer(), nullable=True),
        sa.Column('monitoring_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('monitoring_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('monitoring_hours', sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column('quality_score', sa.Integer(), nullable=True),
        sa.Column('rework_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('efficiency_score', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('completion_notes', sa.String(), nullable=True),
        sa.Column('completed_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['production_project_id'], ['production_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_credit_id'], ['access_asset_credits.id']),
        sa.ForeignKeyConstraint(['reviewer_credit_id'], ['access_asset_credits.id']),
        sa.ForeignKeyConstraint(['monitor_credit_id'], ['access_asset_credits.id']),
        sa.ForeignKeyConstraint(['completed_by'], ['users.id'])
    )
    
    # production_tasks 제약조건 추가
    op.create_check_constraint(
        'check_stage_number',
        'production_tasks',
        "stage_number IN (1, 2, 3, 4)"
    )
    
    op.create_check_constraint(
        'check_task_status',
        'production_tasks',
        "task_status IN ('pending', 'in_progress', 'completed', 'blocked')"
    )
    
    op.create_check_constraint(
        'check_quality_score',
        'production_tasks',
        "quality_score IN (1, 2, 3, 4, 5) OR quality_score IS NULL"
    )
    
    op.create_check_constraint(
        'check_task_order_non_negative',
        'production_tasks',
        "task_order >= 0"
    )
    
    # production_tasks 인덱스 생성
    op.create_index(op.f('ix_production_tasks_production_project_id'), 'production_tasks', ['production_project_id'], unique=False)
    op.create_index('idx_production_tasks_project_stage', 'production_tasks', ['production_project_id', 'stage_number', 'task_order'], unique=False)
    op.create_index('idx_production_tasks_credit', 'production_tasks', ['assigned_credit_id'], unique=False)
    op.create_index('idx_production_tasks_dates', 'production_tasks', ['actual_start_date', 'actual_end_date'], unique=False)
    op.create_index('idx_production_tasks_status', 'production_tasks', ['task_status'], unique=False)

    # ═══════════════════════════════════════════════════════════════════════
    # 3. PRODUCTION_MEMOS 테이블 생성
    # ═══════════════════════════════════════════════════════════════════════
    op.create_table(
        'production_memos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('production_project_id', sa.Integer(), nullable=False),
        sa.Column('production_task_id', sa.Integer(), nullable=True),
        sa.Column('memo_content', sa.String(), nullable=False),
        sa.Column('memo_type', sa.String(), nullable=False, default='general'),
        sa.Column('priority_level', sa.Integer(), nullable=False, default=3),
        sa.Column('tags', sa.String(length=200), nullable=True),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['production_project_id'], ['production_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['production_task_id'], ['production_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'])
    )
    
    # production_memos 제약조건 추가
    op.create_check_constraint(
        'check_memo_type',
        'production_memos',
        "memo_type IN ('general', 'issue', 'decision', 'review')"
    )
    
    op.create_check_constraint(
        'check_priority_level',
        'production_memos',
        "priority_level BETWEEN 1 AND 5"
    )
    
    # production_memos 인덱스 생성
    op.create_index(op.f('ix_production_memos_production_project_id'), 'production_memos', ['production_project_id'], unique=False)
    op.create_index('idx_production_memos_created', 'production_memos', ['created_at'], unique=False)

    # ═══════════════════════════════════════════════════════════════════════
    # 4. PRODUCTION_TEMPLATES 테이블 생성
    # ═══════════════════════════════════════════════════════════════════════
    op.create_table(
        'production_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('media_type', sa.String(length=2), nullable=False),
        sa.Column('stage_number', sa.Integer(), nullable=False),
        sa.Column('task_name', sa.String(length=100), nullable=False),
        sa.Column('task_order', sa.Integer(), nullable=False, default=0),
        sa.Column('speed_a_hours', sa.DECIMAL(precision=6, scale=2), nullable=False),
        sa.Column('speed_b_hours', sa.DECIMAL(precision=6, scale=2), nullable=False),
        sa.Column('speed_c_hours', sa.DECIMAL(precision=6, scale=2), nullable=False),
        sa.Column('requires_review', sa.Boolean(), nullable=False, default=False),
        sa.Column('review_hours_a', sa.DECIMAL(precision=6, scale=2), nullable=False, default=0.0),
        sa.Column('review_hours_b', sa.DECIMAL(precision=6, scale=2), nullable=False, default=0.0),
        sa.Column('review_hours_c', sa.DECIMAL(precision=6, scale=2), nullable=False, default=0.0),
        sa.Column('requires_monitoring', sa.Boolean(), nullable=False, default=False),
        sa.Column('monitoring_hours_a', sa.DECIMAL(precision=6, scale=2), nullable=False, default=0.0),
        sa.Column('monitoring_hours_b', sa.DECIMAL(precision=6, scale=2), nullable=False, default=0.0),
        sa.Column('monitoring_hours_c', sa.DECIMAL(precision=6, scale=2), nullable=False, default=0.0),
        sa.Column('prerequisite_tasks', sa.JSON(), nullable=True),
        sa.Column('is_required', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_parallel', sa.Boolean(), nullable=False, default=False),
        sa.Column('quality_checklist', sa.JSON(), nullable=True),
        sa.Column('acceptance_criteria', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('media_type', 'stage_number', 'task_order', name='unique_media_stage_order')
    )
    
    # production_templates 제약조건 추가
    op.create_check_constraint(
        'check_media_type_template',
        'production_templates',
        "media_type IN ('AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR')"
    )
    
    op.create_check_constraint(
        'check_stage_number_template',
        'production_templates',
        "stage_number IN (1, 2, 3, 4)"
    )
    
    op.create_check_constraint(
        'check_speed_hours_positive',
        'production_templates',
        "speed_a_hours >= 0.5 AND speed_b_hours >= 0.5 AND speed_c_hours >= 0.5"
    )
    
    op.create_check_constraint(
        'check_review_hours_non_negative',
        'production_templates',
        "review_hours_a >= 0 AND review_hours_b >= 0 AND review_hours_c >= 0"
    )
    
    op.create_check_constraint(
        'check_monitoring_hours_non_negative',
        'production_templates',
        "monitoring_hours_a >= 0 AND monitoring_hours_b >= 0 AND monitoring_hours_c >= 0"
    )
    
    # production_templates 인덱스 생성
    op.create_index('idx_production_templates_media_stage', 'production_templates', ['media_type', 'stage_number'], unique=False)
    op.create_index('idx_production_templates_active', 'production_templates', ['is_active'], unique=False)

    # ═══════════════════════════════════════════════════════════════════════
    # 5. WORKER_PERFORMANCE_RECORDS 테이블 생성
    # ═══════════════════════════════════════════════════════════════════════
    op.create_table(
        'worker_performance_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('production_task_id', sa.Integer(), nullable=False),
        sa.Column('credit_id', sa.Integer(), nullable=False),
        sa.Column('person_type', sa.String(length=20), nullable=False),
        sa.Column('role_name', sa.String(length=50), nullable=False),
        sa.Column('work_type', sa.String(length=20), nullable=False),
        sa.Column('planned_hours', sa.DECIMAL(precision=6, scale=2), nullable=False),
        sa.Column('actual_hours', sa.DECIMAL(precision=6, scale=2), nullable=False),
        sa.Column('efficiency_ratio', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('quality_score', sa.Integer(), nullable=True),
        sa.Column('rework_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('rework_hours', sa.DECIMAL(precision=6, scale=2), nullable=False, server_default='0.00'),
        sa.Column('planned_completion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_completion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('days_variance', sa.Integer(), nullable=True),
        sa.Column('supervisor_rating', sa.Integer(), nullable=True),
        sa.Column('collaboration_rating', sa.Integer(), nullable=True),
        sa.Column('punctuality_rating', sa.Integer(), nullable=True),
        sa.Column('feedback_notes', sa.String(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['production_task_id'], ['production_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['credit_id'], ['access_asset_credits.id'])
    )
    
    # worker_performance_records 제약조건 추가
    op.create_check_constraint(
        'check_person_type',
        'worker_performance_records',
        "person_type IN ('scriptwriter', 'voice_artist', 'sl_interpreter', 'staff')"
    )
    
    op.create_check_constraint(
        'check_work_type',
        'worker_performance_records',
        "work_type IN ('main', 'review', 'monitoring')"
    )
    
    op.create_check_constraint(
        'check_quality_score_performance',
        'worker_performance_records',
        "quality_score IS NULL OR quality_score IN (1, 2, 3, 4, 5)"
    )
    
    op.create_check_constraint(
        'check_supervisor_rating',
        'worker_performance_records',
        "supervisor_rating IS NULL OR supervisor_rating IN (1, 2, 3, 4, 5)"
    )
    
    op.create_check_constraint(
        'check_collaboration_rating',
        'worker_performance_records',
        "collaboration_rating IS NULL OR collaboration_rating IN (1, 2, 3, 4, 5)"
    )
    
    op.create_check_constraint(
        'check_punctuality_rating',
        'worker_performance_records',
        "punctuality_rating IS NULL OR punctuality_rating IN (1, 2, 3, 4, 5)"
    )
    
    # worker_performance_records 인덱스 생성
    op.create_index('idx_performance_records_credit', 'worker_performance_records', ['credit_id'], unique=False)
    op.create_index('idx_performance_records_type', 'worker_performance_records', ['person_type'], unique=False)
    op.create_index('idx_performance_records_work_type', 'worker_performance_records', ['work_type'], unique=False)
    op.create_index('idx_performance_records_recorded', 'worker_performance_records', ['recorded_at'], unique=False)
    op.create_index('idx_worker_performance_person_type', 'worker_performance_records', ['person_type'], unique=False)
    op.create_index('idx_worker_performance_work_type', 'worker_performance_records', ['work_type'], unique=False)

    # ═══════════════════════════════════════════════════════════════════════
    # 6. PRODUCTION_ARCHIVES 테이블 생성
    # ═══════════════════════════════════════════════════════════════════════
    op.create_table(
        'production_archives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('original_project_id', sa.Integer(), nullable=False),
        sa.Column('access_asset_id', sa.Integer(), nullable=False),
        sa.Column('movie_title', sa.String(length=200), nullable=False),
        sa.Column('media_type', sa.String(length=2), nullable=False),
        sa.Column('asset_name', sa.String(length=200), nullable=False),
        sa.Column('work_speed_type', sa.String(length=1), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('completion_date', sa.Date(), nullable=False),
        sa.Column('total_days', sa.Integer(), nullable=False),
        sa.Column('total_hours', sa.DECIMAL(precision=8, scale=2), nullable=True),
        sa.Column('participants', sa.JSON(), nullable=False),
        sa.Column('overall_efficiency', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('average_quality', sa.DECIMAL(precision=3, scale=1), nullable=True),
        sa.Column('total_cost', sa.DECIMAL(precision=12, scale=2), nullable=True),
        sa.Column('rework_percentage', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('stage_durations', sa.JSON(), nullable=True),
        sa.Column('project_success_rating', sa.Integer(), nullable=True),
        sa.Column('lessons_learned', sa.String(), nullable=True),
        sa.Column('completion_notes', sa.String(), nullable=True),
        sa.Column('archived_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('archived_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['access_asset_id'], ['access_assets.id']),
        sa.ForeignKeyConstraint(['archived_by'], ['users.id'])
    )
    
    # production_archives 제약조건 추가
    op.create_check_constraint(
        'check_media_type_archive',
        'production_archives',
        "media_type IN ('AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR')"
    )
    
    op.create_check_constraint(
        'check_work_speed_type_archive',
        'production_archives',
        "work_speed_type IN ('A', 'B', 'C')"
    )
    
    op.create_check_constraint(
        'check_project_success_rating',
        'production_archives',
        "project_success_rating BETWEEN 1 AND 5"
    )
    
    # production_archives 인덱스 생성
    op.create_index('idx_production_archives_media_type', 'production_archives', ['media_type'], unique=False)
    op.create_index('idx_production_archives_completion', 'production_archives', ['completion_date'], unique=False)
    op.create_index('idx_production_archives_speed_type', 'production_archives', ['work_speed_type'], unique=False)
    op.create_index('idx_production_archives_archived', 'production_archives', ['archived_at'], unique=False)


def downgrade() -> None:
    """마이그레이션 롤백 - 모든 제작 관리 테이블 제거"""
    
    # 테이블 제거 (외래키 종속성 역순)
    op.drop_table('production_archives')
    op.drop_table('worker_performance_records') 
    op.drop_table('production_templates')
    op.drop_table('production_memos')
    op.drop_table('production_tasks')
    op.drop_table('production_projects')
