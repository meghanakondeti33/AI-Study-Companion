"""quizzes_questions_attempts_answers

Revision ID: 004
Revises: 003
Create Date: 2026-09-16 17:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. quizzes table
    op.create_table(
        'quizzes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='READY'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quizzes_user_id'), 'quizzes', ['user_id'], unique=False)
    op.create_index(op.f('ix_quizzes_project_id'), 'quizzes', ['project_id'], unique=False)

    # 2. quiz_questions table
    op.create_table(
        'quiz_questions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('quiz_id', sa.String(length=36), nullable=False),
        sa.Column('question_type', sa.String(length=20), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('source_citations', sa.JSON(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=False, server_default='medium'),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_questions_quiz_id'), 'quiz_questions', ['quiz_id'], unique=False)
    op.create_index(op.f('ix_quiz_questions_question_type'), 'quiz_questions', ['question_type'], unique=False)

    # 3. quiz_attempts table
    op.create_table(
        'quiz_attempts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('quiz_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_attempts_quiz_id'), 'quiz_attempts', ['quiz_id'], unique=False)
    op.create_index(op.f('ix_quiz_attempts_user_id'), 'quiz_attempts', ['user_id'], unique=False)

    # 4. quiz_answers table
    op.create_table(
        'quiz_answers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('attempt_id', sa.String(length=36), nullable=False),
        sa.Column('question_id', sa.String(length=36), nullable=False),
        sa.Column('answer_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('evaluation_details', sa.JSON(), nullable=True),
        sa.Column('evaluated_by', sa.String(length=50), nullable=False, server_default='system'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['attempt_id'], ['quiz_attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['quiz_questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_answers_attempt_id'), 'quiz_answers', ['attempt_id'], unique=False)
    op.create_index(op.f('ix_quiz_answers_question_id'), 'quiz_answers', ['question_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_quiz_answers_question_id'), table_name='quiz_answers')
    op.drop_index(op.f('ix_quiz_answers_attempt_id'), table_name='quiz_answers')
    op.drop_table('quiz_answers')

    op.drop_index(op.f('ix_quiz_attempts_user_id'), table_name='quiz_attempts')
    op.drop_index(op.f('ix_quiz_attempts_quiz_id'), table_name='quiz_attempts')
    op.drop_table('quiz_attempts')

    op.drop_index(op.f('ix_quiz_questions_question_type'), table_name='quiz_questions')
    op.drop_index(op.f('ix_quiz_questions_quiz_id'), table_name='quiz_questions')
    op.drop_table('quiz_questions')

    op.drop_index(op.f('ix_quizzes_project_id'), table_name='quizzes')
    op.drop_index(op.f('ix_quizzes_user_id'), table_name='quizzes')
    op.drop_table('quizzes')
