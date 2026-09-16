"""tutor_conversations_messages

Revision ID: 003
Revises: 002
Create Date: 2026-09-16 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. tutor_conversations table
    op.create_table(
        'tutor_conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tutor_conversations_user_id'), 'tutor_conversations', ['user_id'], unique=False)
    op.create_index(op.f('ix_tutor_conversations_project_id'), 'tutor_conversations', ['project_id'], unique=False)

    # 2. tutor_messages table
    op.create_table(
        'tutor_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('citations', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['tutor_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tutor_messages_conversation_id'), 'tutor_messages', ['conversation_id'], unique=False)

    # 3. ai_requests table for AI telemetry
    op.create_table(
        'ai_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=True),
        sa.Column('feature', sa.String(length=50), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('latency_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='success'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retrieval_chunks_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_requests_user_id'), 'ai_requests', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_requests_project_id'), 'ai_requests', ['project_id'], unique=False)
    op.create_index(op.f('ix_ai_requests_feature'), 'ai_requests', ['feature'], unique=False)


def downgrade() -> None:
    op.drop_table('ai_requests')
    op.drop_table('tutor_messages')
    op.drop_table('tutor_conversations')
