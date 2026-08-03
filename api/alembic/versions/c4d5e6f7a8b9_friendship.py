"""friendship

Revision ID: c4d5e6f7a8b9
Revises: 175267a45879
Create Date: 2026-08-03 18:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "175267a45879"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.create_table(
    "friendship",
    sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
    sa.Column("user_a_id", sa.String(), nullable=False),
    sa.Column("user_b_id", sa.String(), nullable=False),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    sa.UniqueConstraint("user_a_id", "user_b_id"),
  )
  op.create_index("ix_friendship_user_a_id", "friendship", ["user_a_id"])
  op.create_index("ix_friendship_user_b_id", "friendship", ["user_b_id"])


def downgrade() -> None:
  op.drop_index("ix_friendship_user_b_id", table_name="friendship")
  op.drop_index("ix_friendship_user_a_id", table_name="friendship")
  op.drop_table("friendship")
