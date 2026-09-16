"""add_learner_context

Revision ID: 007
Revises: 006
Create Date: 2026-09-16 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'learner_contexts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('context_type', sa.String(length=255), nullable=False),
        sa.Column('context_key', sa.String(length=255), nullable=False),
        sa.Column('context_value', sa.String(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('source_projects', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learner_contexts_user_id'), 'learner_contexts', ['user_id'], unique=False)
    op.create_index(op.f('ix_learner_contexts_context_type'), 'learner_contexts', ['context_type'], unique=False)
    op.create_index(op.f('ix_learner_contexts_context_key'), 'learner_contexts', ['context_key'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_learner_contexts_context_key'), table_name='learner_contexts')
    op.drop_index(op.f('ix_learner_contexts_context_type'), table_name='learner_contexts')
    op.drop_index(op.f('ix_learner_contexts_user_id'), table_name='learner_contexts')
    op.drop_table('learner_contexts')
