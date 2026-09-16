"""growth_and_recommendations

Revision ID: 006
Revises: 005
Create Date: 2026-09-16 17:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. growth_snapshots table
    op.create_table(
        'growth_snapshots',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('overall_mastery', sa.Float(), nullable=False),
        sa.Column('previous_overall_mastery', sa.Float(), nullable=True),
        sa.Column('trend_delta', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_growth_snapshots_project_id'), 'growth_snapshots', ['project_id'], unique=False)
    op.create_index(op.f('ix_growth_snapshots_status'), 'growth_snapshots', ['status'], unique=False)
    op.create_index(op.f('ix_growth_snapshots_user_id'), 'growth_snapshots', ['user_id'], unique=False)

    # 2. recommendations table
    op.create_table(
        'recommendations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('recommendation_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=20), server_default='medium', nullable=False),
        sa.Column('target_concept_id', sa.String(length=36), nullable=True),
        sa.Column('action_url', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_concept_id'], ['concepts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recommendations_project_id'), 'recommendations', ['project_id'], unique=False)
    op.create_index(op.f('ix_recommendations_recommendation_type'), 'recommendations', ['recommendation_type'], unique=False)
    op.create_index(op.f('ix_recommendations_status'), 'recommendations', ['status'], unique=False)
    op.create_index(op.f('ix_recommendations_target_concept_id'), 'recommendations', ['target_concept_id'], unique=False)
    op.create_index(op.f('ix_recommendations_user_id'), 'recommendations', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recommendations_user_id'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_target_concept_id'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_status'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_recommendation_type'), table_name='recommendations')
    op.drop_index(op.f('ix_recommendations_project_id'), table_name='recommendations')
    op.drop_table('recommendations')

    op.drop_index(op.f('ix_growth_snapshots_user_id'), table_name='growth_snapshots')
    op.drop_index(op.f('ix_growth_snapshots_status'), table_name='growth_snapshots')
    op.drop_index(op.f('ix_growth_snapshots_project_id'), table_name='growth_snapshots')
    op.drop_table('growth_snapshots')
