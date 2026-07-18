# Study session endpoints: SM-2 reviews and deck mastery.

from datetime import datetime
from random import shuffle
from typing import Annotated, Any, Sequence, cast

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import CursorResult, delete, select
from sqlalchemy.orm import joinedload

from auth import CurrentUserId
from db import SessionDep
from models import (
  Card,
  CardReviewRequest,
  CardReviewResponse,
  CompleteStudySessionResponse,
  Deck,
  DeckMasteryResponse,
  StudySessionCard,
  StudySession,
  StudySessionCardResponse,
  StudySessionResponse,
)
from utils.mastery import calculate_deck_mastery
from utils.sm2 import calculate_sm2, rating_to_quality

router = APIRouter(tags=["study"])

@router.post("/api/decks/{deckId}/study", response_model=StudySessionResponse)
async def study(
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
  mastery=calculate_deck_mastery(cards)

  async def get_existing_study_session():
    existing_study_session = (await session.execute(
      select(StudySession)
      .options(joinedload(StudySession.cards))
      .where(StudySession.deck_id == deck_id)
    )).unique().scalar_one_or_none()
    if existing_study_session is None:
      return None
    study_session_cards = (await session.execute(
      select(StudySessionCard).options(joinedload(StudySessionCard.card))
      .where(StudySessionCard.study_session_id == existing_study_session.id)
      .order_by(StudySessionCard.index.asc()))).scalars().all()
    index, page = get_study_session_index_and_page(study_session_cards)
    return StudySessionResponse(
      deck_id=deck_id,
      cards = [
        StudySessionCardResponse(
          id=study_card.card_id,
          question=study_card.card.question,
          answer=study_card.card.answer,
          rating=study_card.rating,
        ) for study_card in study_session_cards
      ],
      index=index,
      page=page,
      mastery=mastery,
      old_mastery=existing_study_session.old_mastery,
    )
  
  async def create_new_study_session():
    cards_due = list((await session.execute(select(Card).where(Card.deck_id == deck_id, Card.next_review_date <= datetime.utcnow()).limit(20))).scalars().all())
    if len(cards_due) == 0:
      return StudySessionResponse(
        deck_id=deck_id,
        cards=[],
        index=0,
        page="cards",
        mastery=mastery,
        old_mastery=mastery,
      )
    shuffle(cards_due)
    study_session = StudySession(
      deck_id=deck_id,
      old_mastery=mastery,
    )
    session.add(study_session)
    await session.flush()
    study_cards: list[StudySessionCardResponse] = []
    for i, card in enumerate(cards_due):
      study_card = StudySessionCard(
        card_id=card.id,
        index=i,
        study_session_id=study_session.id,
        rating=None,
      )
      session.add(study_card)
      await session.flush()
      study_cards.append(StudySessionCardResponse(
        id=study_card.card_id,
        question=card.question,
        answer=card.answer,
        rating=None,
      ))
    await session.commit()
    return StudySessionResponse(
      deck_id=deck_id,
      cards=study_cards,
      index=0,
      page="cards",
      mastery=mastery,
      old_mastery=study_session.old_mastery,
    )
  
  existing = await get_existing_study_session()
  if existing is None:
    try:
      return await create_new_study_session()
    except Exception as e:
      # Race condition: a new study session was already created before we could create one,
      # causing an exception.
      await session.rollback()
      existing = await get_existing_study_session()
      if existing is None:
        raise e
      return existing
  return existing

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
  
  deck = (await session.execute(
    select(Deck)
    .options(joinedload(Deck.cards))
    .where(Deck.id == card.deck_id)
  )).unique().scalar_one_or_none()
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Card not found")
  
  study_session_card = (await session.execute(
    select(StudySessionCard)
    .options(joinedload(StudySessionCard.study_session))
    .where(StudySessionCard.card_id == card_id)
  )).scalar_one_or_none()
  if not study_session_card:
    raise HTTPException(status_code=404, detail="Card not found")
  
  if study_session_card.rating is not None:
    mastery = calculate_deck_mastery(deck.cards)
    # Already rated.
    return CardReviewResponse(
      id=card.id,
      repetition_count=card.repetition_count,
      easiness_factor=card.easiness_factor,
      interval=card.interval,
      next_review_date=card.next_review_date,
      mastery=mastery,
    )

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

  study_session_card.rating = body.rating

  await session.flush()

  mastery = calculate_deck_mastery(deck.cards)

  await session.commit()
  await session.refresh(card)

  return CardReviewResponse(
    id=card.id,
    repetition_count=card.repetition_count,
    easiness_factor=card.easiness_factor,
    interval=card.interval,
    next_review_date=card.next_review_date,
    mastery=mastery,
  )

@router.delete("/api/decks/{deckId}/complete", response_model=CompleteStudySessionResponse)
async def complete_study_session(
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
  
  study_session = (await session.execute(
    select(StudySession)
    .where(StudySession.deck_id == deck_id)
  )).scalar_one_or_none()
  if study_session is None:
    raise HTTPException(status_code=404, detail="Study session not found")
  result = await session.execute(delete(StudySession).where(StudySession.deck_id == deck_id))
  await session.commit()
  return CompleteStudySessionResponse(success=cast(CursorResult[Any], result).rowcount > 0)

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

def get_study_session_index_and_page(study_session_cards: Sequence[StudySessionCard]):
  index = 0
  page = "cards"
  for study_session_card in study_session_cards:
    if study_session_card.rating is not None:
      maybe_index = study_session_card.index + 1
      if maybe_index < len(study_session_cards):
        index = maybe_index
      else:
        page = "results"
  return (index, page)