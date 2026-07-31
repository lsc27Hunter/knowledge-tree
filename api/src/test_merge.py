"""Unit tests for CSV merge (no DB)."""

import pytest

from utils.merge import (
  CsvRow,
  apply_csv_merge,
  normalize_prompt,
  parse_csv_rows,
  plan_csv_merge,
)


class FakeCard:
  def __init__(self, question: str, answer: str):
    self.question = question
    self.answer = answer


def test_normalize_prompt_trims_and_lowercases():
  assert normalize_prompt("  What Is Git?  ") == "what is git?"


def test_parse_csv_rows_happy_path():
  text = "Q1,A1\nQ2,A2\n"
  rows = parse_csv_rows(text)
  assert rows == [CsvRow("Q1", "A1"), CsvRow("Q2", "A2")]


def test_parse_csv_rows_rejects_bad_columns():
  with pytest.raises(ValueError, match="expected 2 columns"):
    parse_csv_rows("only-one-column\n")


def test_parse_csv_rows_rejects_empty():
  with pytest.raises(ValueError, match="no valid"):
    parse_csv_rows("\n\n")


def test_plan_detects_added_updated_unchanged():
  existing = [
    FakeCard("What is git?", "A VCS"),
    FakeCard("What is a commit?", "A snapshot"),
  ]
  rows = [
    CsvRow("What is git?", "A VCS"),  # unchanged
    CsvRow("What is a commit?", "A recorded snapshot"),  # updated
    CsvRow("What is a remote?", "A named repo reference"),  # added
  ]
  plan = plan_csv_merge(rows, existing)
  by_kind = {c.kind: c for c in plan}
  assert by_kind["unchanged"].question == "What is git?"
  assert by_kind["updated"].old_answer == "A snapshot"
  assert by_kind["updated"].new_answer == "A recorded snapshot"
  assert by_kind["added"].new_answer == "A named repo reference"


def test_plan_matches_case_insensitive_prompts():
  existing = [FakeCard("What is Git?", "old")]
  plan = plan_csv_merge([CsvRow("what is git?", "new")], existing)
  assert len(plan) == 1
  assert plan[0].kind == "updated"
  assert plan[0].key == "what is git?"


def test_apply_rejects_all_when_accepted_empty():
  existing = [FakeCard("Q1", "old")]
  result = apply_csv_merge(
    [CsvRow("Q1", "new")],
    existing,
    deck_id=1,
    accepted_keys=set(),
  )
  assert result.stats.updated == 0
  assert existing[0].answer == "old"


def test_apply_updates_when_key_accepted():
  existing = [FakeCard("Q1", "old")]
  result = apply_csv_merge(
    [CsvRow("Q1", "new")],
    existing,
    deck_id=1,
    accepted_keys={"q1"},
  )
  assert result.stats.updated == 1
  assert existing[0].answer == "new"


def test_apply_adds_only_accepted_new_rows(monkeypatch):
  created: list[tuple[int, str, str]] = []

  class StubCard:
    def __init__(self, deck_id: int, question: str, answer: str, **_kwargs):
      self.deck_id = deck_id
      self.question = question
      self.answer = answer
      created.append((deck_id, question, answer))

  # apply_csv_merge does `from models import Card` internally.
  monkeypatch.setattr("models.Card", StubCard)

  existing = [FakeCard("Keep", "same")]
  result = apply_csv_merge(
    [
      CsvRow("Keep", "same"),
      CsvRow("New Q", "New A"),
      CsvRow("Rejected Q", "Nope"),
    ],
    existing,
    deck_id=42,
    accepted_keys={"new q"},  # only accept the new card
  )
  assert result.stats.unchanged == 1
  assert result.stats.added == 1
  assert result.stats.updated == 0
  assert len(result.cards_to_add) == 1
  assert created == [(42, "New Q", "New A")]
