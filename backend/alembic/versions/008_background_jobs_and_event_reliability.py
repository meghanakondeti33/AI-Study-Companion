"""background_jobs_and_event_reliability

Revision ID: 008
Revises: 007
Create Date: 2026-09-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add background_jobs table
    op.create_table('background_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('job_type', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='QUEUED'),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=True),
        sa.Column('entity_id', sa.String(length=36), nullable=True),
        sa.Column('entity_type', sa.String(length=100), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.String(length=2000), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_background_jobs_entity_id'), 'background_jobs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_background_jobs_job_type'), 'background_jobs', ['job_type'], unique=False)
    op.create_index(op.f('ix_background_jobs_project_id'), 'background_jobs', ['project_id'], unique=False)
    op.create_index(op.f('ix_background_jobs_status'), 'background_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_background_jobs_user_id'), 'background_jobs', ['user_id'], unique=False)

    # 2. Add idempotency_key to learning_events
    op.add_column('learning_events', sa.Column('idempotency_key', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_learning_events_idempotency_key'), 'learning_events', ['idempotency_key'], unique=False)
    
    # Use standard approach for unique constraint that works in SQLite tests as well.
    with op.batch_alter_table('learning_events', schema=None) as batch_op:
        batch_op.create_unique_constraint('uix_learning_events_user_id_idempotency_key', ['user_id', 'idempotency_key'])


def downgrade() -> None:
    with op.batch_alter_table('learning_events', schema=None) as batch_op:
        batch_op.drop_constraint('uix_learning_events_user_id_idempotency_key', type_='unique')
        batch_op.drop_index(op.f('ix_learning_events_idempotency_key'))
        batch_op.drop_column('idempotency_key')

    op.drop_index(op.f('ix_background_jobs_user_id'), table_name='background_jobs')
    op.drop_index(op.f('ix_background_jobs_status'), table_name='background_jobs')
    op.drop_index(op.f('ix_background_jobs_project_id'), table_name='background_jobs')
    op.drop_index(op.f('ix_background_jobs_job_type'), table_name='background_jobs')
    op.drop_index(op.f('ix_background_jobs_entity_id'), table_name='background_jobs')
    op.drop_table('background_jobs')
