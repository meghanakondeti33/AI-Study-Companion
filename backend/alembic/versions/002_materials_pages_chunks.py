"""materials_pages_chunks

Revision ID: 002
Revises: 001
Create Date: 2026-09-16 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure pgvector extension is available in PostgreSQL
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. learning_events table
    op.create_table(
        'learning_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learning_events_user_id'), 'learning_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_learning_events_project_id'), 'learning_events', ['project_id'], unique=False)
    op.create_index(op.f('ix_learning_events_event_type'), 'learning_events', ['event_type'], unique=False)

    # 3. materials table
    op.create_table(
        'materials',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(length=500), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_materials_project_id'), 'materials', ['project_id'], unique=False)
    op.create_index(op.f('ix_materials_status'), 'materials', ['status'], unique=False)

    # 4. material_pages table
    op.create_table(
        'material_pages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('material_id', sa.String(length=36), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_pages_material_id'), 'material_pages', ['material_id'], unique=False)
    op.create_index(op.f('ix_material_pages_page_number'), 'material_pages', ['page_number'], unique=False)

    # 5. material_chunks table with pgvector embedding
    op.create_table(
        'material_chunks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('material_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_chunks_material_id'), 'material_chunks', ['material_id'], unique=False)
    op.create_index(op.f('ix_material_chunks_project_id'), 'material_chunks', ['project_id'], unique=False)
    op.create_index(op.f('ix_material_chunks_page_number'), 'material_chunks', ['page_number'], unique=False)


def downgrade() -> None:
    op.drop_table('material_chunks')
    op.drop_table('material_pages')
    op.drop_table('materials')
    op.drop_table('learning_events')
