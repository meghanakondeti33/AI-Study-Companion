"""concepts_mastery_history
 
Revision ID: 005
Revises: 004
Create Date: 2026-09-16 17:30:00.000000
 
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
 
 
# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
 
 
def upgrade() -> None:
    # 1. concepts table
    op.create_table(
        'concepts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'name', name='uq_project_concept_name')
    )
    op.create_index(op.f('ix_concepts_project_id'), 'concepts', ['project_id'], unique=False)
    op.create_index(op.f('ix_concepts_name'), 'concepts', ['name'], unique=False)
 
    # 2. concept_mastery table
    op.create_table(
        'concept_mastery',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('concept_id', sa.String(length=36), nullable=False),
        sa.Column('mastery_score', sa.Float(), nullable=False),
        sa.Column('last_assessed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['concept_id'], ['concepts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'concept_id', name='uq_user_concept_mastery')
    )
    op.create_index(op.f('ix_concept_mastery_concept_id'), 'concept_mastery', ['concept_id'], unique=False)
    op.create_index(op.f('ix_concept_mastery_project_id'), 'concept_mastery', ['project_id'], unique=False)
    op.create_index(op.f('ix_concept_mastery_user_id'), 'concept_mastery', ['user_id'], unique=False)
 
    # 3. mastery_history table
    op.create_table(
        'mastery_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('concept_id', sa.String(length=36), nullable=False),
        sa.Column('previous_score', sa.Float(), nullable=False),
        sa.Column('new_score', sa.Float(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('evidence_id', sa.String(length=100), nullable=True),
        sa.Column('evidence_details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['concept_id'], ['concepts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mastery_history_concept_id'), 'mastery_history', ['concept_id'], unique=False)
    op.create_index(op.f('ix_mastery_history_evidence_id'), 'mastery_history', ['evidence_id'], unique=False)
    op.create_index(op.f('ix_mastery_history_project_id'), 'mastery_history', ['project_id'], unique=False)
    op.create_index(op.f('ix_mastery_history_user_id'), 'mastery_history', ['user_id'], unique=False)
 
 
def downgrade() -> None:
    op.drop_index(op.f('ix_mastery_history_user_id'), table_name='mastery_history')
    op.drop_index(op.f('ix_mastery_history_project_id'), table_name='mastery_history')
    op.drop_index(op.f('ix_mastery_history_evidence_id'), table_name='mastery_history')
    op.drop_index(op.f('ix_mastery_history_concept_id'), table_name='mastery_history')
    op.drop_table('mastery_history')
 
    op.drop_index(op.f('ix_concept_mastery_user_id'), table_name='concept_mastery')
    op.drop_index(op.f('ix_concept_mastery_project_id'), table_name='concept_mastery')
    op.drop_index(op.f('ix_concept_mastery_concept_id'), table_name='concept_mastery')
    op.drop_table('concept_mastery')
 
    op.drop_index(op.f('ix_concepts_name'), table_name='concepts')
    op.drop_index(op.f('ix_concepts_project_id'), table_name='concepts')
    op.drop_table('concepts')
