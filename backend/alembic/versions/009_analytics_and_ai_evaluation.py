"""analytics_and_ai_evaluation

Revision ID: c0fcda914d41
Revises: 008
Create Date: 2026-09-16 22:43:14.221764

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_evaluations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('ai_request_id', sa.String(length=36), nullable=False),
        sa.Column('evaluator_type', sa.String(length=100), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ai_request_id'], ['ai_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_evaluations_ai_request_id'), 'ai_evaluations', ['ai_request_id'], unique=False)
    op.create_index(op.f('ix_ai_evaluations_evaluator_type'), 'ai_evaluations', ['evaluator_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_evaluations_evaluator_type'), table_name='ai_evaluations')
    op.drop_index(op.f('ix_ai_evaluations_ai_request_id'), table_name='ai_evaluations')
    op.drop_table('ai_evaluations')
