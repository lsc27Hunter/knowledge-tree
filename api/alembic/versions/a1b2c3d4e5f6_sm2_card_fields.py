"""Rename SM-2 card columns and add next_review_date

Revision ID: a1b2c3d4e5f6
Revises: f0a571ee4135
Create Date: 2026-07-13 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f0a571ee4135'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('card', 'n', new_column_name='repetition_count')
    op.alter_column('card', 'ef', new_column_name='easiness_factor')
    op.alter_column('card', 'i', new_column_name='interval')
    op.add_column(
        'card',
        sa.Column('next_review_date', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    # Existing cards that were created with ef=0 get a proper SM-2 default.
    op.execute("UPDATE card SET easiness_factor = 2.5 WHERE easiness_factor < 1.3")


def downgrade() -> None:
    op.drop_column('card', 'next_review_date')
    op.alter_column('card', 'interval', new_column_name='i')
    op.alter_column('card', 'easiness_factor', new_column_name='ef')
    op.alter_column('card', 'repetition_count', new_column_name='n')
