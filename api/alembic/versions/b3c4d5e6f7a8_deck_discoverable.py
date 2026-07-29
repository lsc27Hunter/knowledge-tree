"""deck_discoverable

Revision ID: b3c4d5e6f7a8
Revises: 93d477fecec2
Create Date: 2026-07-27 16:40:00.000000

Add deck.discoverable. Uses IF NOT EXISTS in case the column was already added.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "93d477fecec2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.execute(
    sa.text(
      """
      ALTER TABLE deck
      ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT false NOT NULL
      """
    )
  )
  # Match other NOT NULL bool columns: no lingering server default.
  op.execute(sa.text("ALTER TABLE deck ALTER COLUMN discoverable DROP DEFAULT"))
  op.execute(
    sa.text("ALTER TABLE deck ALTER COLUMN discoverable SET NOT NULL")
  )


def downgrade() -> None:
  op.drop_column("deck", "discoverable")
