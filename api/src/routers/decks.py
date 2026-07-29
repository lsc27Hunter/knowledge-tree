# Merge endpoints (kept out of main.py so main stays smaller).

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, UploadFile
from sqlalchemy import select

from auth import CurrentUserId
from db import SessionDep
from models import (
  Card,
  Deck,
  DeckMergeApplyRequest,
  DeckMergeChange,
  DeckMergePreviewResponse,
  DeckMergeResponse,
  DeckMergeStats,
)
from utils.merge import (
  CsvRow,
  apply_csv_merge,
  parse_csv_rows,
  plan_csv_merge,
)

router = APIRouter(tags=["decks"])

# Soft cap so a huge upload can't blow up memory in one request.
_MAX_CSV_BYTES = 2 * 1024 * 1024


async def _owned_deck(session: SessionDep, deck_id: int, user_id: str) -> Deck:
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
  return deck


async def _read_csv_text(file: UploadFile) -> str:
  raw = await file.read(_MAX_CSV_BYTES + 1)
  if len(raw) > _MAX_CSV_BYTES:
    raise HTTPException(status_code=400, detail="CSV is too large (max 2MB).")
  try:
    return raw.decode("utf-8")
  except UnicodeDecodeError as exc:
    raise HTTPException(
      status_code=400,
      detail="CSV must be UTF-8 encoded.",
    ) from exc


def _parse_rows_or_400(file_text: str):
  try:
    return parse_csv_rows(file_text)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
  "/api/decks/{deckId}/merge/preview",
  response_model=DeckMergePreviewResponse,
)
async def preview_merge_deck_csv(
  file: UploadFile,
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  """Preview a CSV merge without writing anything."""
  await _owned_deck(session, deck_id, user_id)
  rows = _parse_rows_or_400(await _read_csv_text(file))

  existing_cards = (
    await session.execute(select(Card).where(Card.deck_id == deck_id))
  ).scalars().all()

  changes = plan_csv_merge(rows, existing_cards)
  stats = DeckMergeStats(
    added=sum(1 for c in changes if c.kind == "added"),
    updated=sum(1 for c in changes if c.kind == "updated"),
    unchanged=sum(1 for c in changes if c.kind == "unchanged"),
  )

  return DeckMergePreviewResponse(
    changes=[
      DeckMergeChange(
        key=c.key,
        kind=c.kind,
        question=c.question,
        old_answer=c.old_answer,
        new_answer=c.new_answer,
      )
      for c in changes
    ],
    stats=stats,
  )


@router.post("/api/decks/{deckId}/merge", response_model=DeckMergeResponse)
async def merge_deck_csv(
  file: UploadFile,
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  """Apply every add/update from the CSV. UI usually uses preview + apply instead."""
  await _owned_deck(session, deck_id, user_id)
  rows = _parse_rows_or_400(await _read_csv_text(file))

  existing_cards = (
    await session.execute(select(Card).where(Card.deck_id == deck_id))
  ).scalars().all()

  result = apply_csv_merge(rows, existing_cards, deck_id)

  for card in result.cards_to_add:
    session.add(card)

  await session.commit()

  return DeckMergeResponse(
    message="Merge successful",
    stats=DeckMergeStats(
      added=result.stats.added,
      updated=result.stats.updated,
      unchanged=result.stats.unchanged,
    ),
  )


@router.post("/api/decks/{deckId}/merge/apply", response_model=DeckMergeResponse)
async def apply_merge_deck_selection(
  body: DeckMergeApplyRequest,
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  """Apply only the rows the client accepted from a preview."""
  await _owned_deck(session, deck_id, user_id)

  # Client already filtered to accepted adds/updates.
  rows = [CsvRow(question=r.question, answer=r.answer) for r in body.rows]

  existing_cards = (
    await session.execute(select(Card).where(Card.deck_id == deck_id))
  ).scalars().all()

  result = apply_csv_merge(rows, existing_cards, deck_id)

  for card in result.cards_to_add:
    session.add(card)

  await session.commit()

  return DeckMergeResponse(
    message="Merge successful",
    stats=DeckMergeStats(
      added=result.stats.added,
      updated=result.stats.updated,
      unchanged=result.stats.unchanged,
    ),
  )
