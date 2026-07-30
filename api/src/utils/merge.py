# CSV merge for decks (git-style add/update, never deletes).
# Matching is by normalized prompt; answer updates leave SM-2 fields alone.

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal, Protocol, Sequence


class MergeableCard(Protocol):
  question: str
  answer: str


@dataclass(frozen=True)
class CsvRow:
  question: str
  answer: str


@dataclass(frozen=True)
class MergeStats:
  added: int
  updated: int
  unchanged: int


@dataclass(frozen=True)
class MergeChange:
  key: str
  kind: Literal["added", "updated", "unchanged"]
  question: str
  old_answer: str | None
  new_answer: str


@dataclass
class MergeResult:
  stats: MergeStats
  cards_to_add: list  # Card instances; typed loosely to avoid circular imports


def normalize_prompt(prompt: str) -> str:
  return prompt.strip().lower()


def parse_csv_rows(file_text: str) -> list[CsvRow]:
  """Parse CSV text into (question, answer) rows. Expects 2 columns."""
  import csv
  from io import StringIO

  rows: list[CsvRow] = []
  reader = csv.reader(StringIO(file_text))

  for line_no, row in enumerate(reader, start=1):
    if len(row) == 0 or all(cell.strip() == "" for cell in row):
      continue

    if len(row) < 2:
      raise ValueError(
        f"Malformed CSV at line {line_no}: expected 2 columns (prompt, answer), got {len(row)}."
      )

    question = row[0].strip()
    answer = row[1].strip()

    if question == "":
      raise ValueError(f"Malformed CSV at line {line_no}: prompt (column A) is empty.")

    rows.append(CsvRow(question=question, answer=answer))

  if not rows:
    raise ValueError("CSV has no valid prompt/answer rows.")

  return rows


def plan_csv_merge(
  rows: Sequence[CsvRow],
  existing_cards: Sequence[MergeableCard],
) -> list[MergeChange]:
  """Dry-run merge. Later duplicate prompts in the CSV win."""
  by_prompt: dict[str, MergeableCard] = {}
  for card in existing_cards:
    key = normalize_prompt(card.question)
    if key not in by_prompt:
      by_prompt[key] = card

  # Last CSV row for a given prompt wins.
  planned: dict[str, MergeChange] = {}

  for row in rows:
    key = normalize_prompt(row.question)
    question = row.question.strip()
    new_answer = row.answer

    if key in by_prompt:
      existing = by_prompt[key]
      old_answer = existing.answer
      kind: Literal["added", "updated", "unchanged"] = (
        "unchanged" if existing.answer.strip() == new_answer else "updated"
      )
      planned[key] = MergeChange(
        key=key,
        kind=kind,
        question=question,
        old_answer=old_answer,
        new_answer=new_answer,
      )
      continue

    # Duplicate "add" prompts in the same CSV: keep the latest answer.
    planned[key] = MergeChange(
      key=key,
      kind="added",
      question=question,
      old_answer=None,
      new_answer=new_answer,
    )

  return list(planned.values())


def apply_csv_merge(
  rows: Sequence[CsvRow],
  existing_cards: Sequence[MergeableCard],
  deck_id: int,
  *,
  accepted_keys: set[str] | None = None,
  now: datetime | None = None,
) -> MergeResult:
  """
  Append/update-only merge.
  If accepted_keys is set, only those keys are applied (unchanged always no-op).
  """
  from models import Card

  review_time = now or datetime.now(UTC).replace(tzinfo=None)
  by_prompt: dict[str, MergeableCard] = {}
  for card in existing_cards:
    key = normalize_prompt(card.question)
    if key not in by_prompt:
      by_prompt[key] = card

  plan = plan_csv_merge(rows, existing_cards)
  added = 0
  updated = 0
  unchanged = 0
  cards_to_add: list = []

  for change in plan:
    if change.kind == "unchanged":
      unchanged += 1
      continue

    if accepted_keys is not None and change.key not in accepted_keys:
      continue

    if change.kind == "updated":
      existing = by_prompt[change.key]
      existing.answer = change.new_answer
      updated += 1
      continue

    new_card = Card(
      deck_id=deck_id,
      question=change.question,
      answer=change.new_answer,
      repetition_count=0,
      easiness_factor=2.5,
      interval=0,
      next_review_date=review_time,
    )
    cards_to_add.append(new_card)
    by_prompt[change.key] = new_card
    added += 1

  return MergeResult(
    stats=MergeStats(added=added, updated=updated, unchanged=unchanged),
    cards_to_add=cards_to_add,
  )
