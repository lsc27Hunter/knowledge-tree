# Study session endpoints: SM-2 reviews and deck mastery.

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import select

from auth import CurrentUserId
from db import SessionDep
from models import (
  Card,
  CardReviewRequest,
  CardReviewResponse,
  Deck,
  DeckMasteryResponse,
)
from utils.mastery import calculate_deck_mastery
from utils.sm2 import calculate_sm2, rating_to_quality

router = APIRouter(tags=["study"])


@router.post("/api/cards/{cardId}/review", response_model=CardReviewResponse)
async def review_card(
  body: CardReviewRequest,
  card_id: Annotated[int, Path(alias="cardId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  card = await session.get(Card, card_id)
  if not card:
    raise HTTPException(status_code=404, detail="Card not found")

  deck = await session.get(Deck, card.deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Card not found")

  try:
    quality = rating_to_quality(body.rating)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc

  result = calculate_sm2(
    quality=quality,
    repetitions=card.repetition_count,
    easiness=card.easiness_factor,
    interval=card.interval,
  )

  card.repetition_count = result.repetitions
  card.easiness_factor = result.easiness
  card.interval = result.interval
  card.next_review_date = result.next_review_date
  deck.last_studied_at = datetime.utcnow()

  await session.commit()
  await session.refresh(card)

  return CardReviewResponse(
    id=card.id,
    repetition_count=card.repetition_count,
    easiness_factor=card.easiness_factor,
    interval=card.interval,
    next_review_date=card.next_review_date,
  )


@router.get("/api/decks/{deckId}/mastery", response_model=DeckMasteryResponse)
async def get_deck_mastery(
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")

  cards = (
    await session.execute(select(Card).where(Card.deck_id == deck_id))
  ).scalars().all()

  return DeckMasteryResponse(
    mastery_percentage=calculate_deck_mastery(cards),
  )
