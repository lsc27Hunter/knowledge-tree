# Study session endpoints: SM-2 reviews and deck mastery.

from datetime import datetime
from random import shuffle
from typing import Annotated, Any, cast

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import CursorResult, delete, select
from sqlalchemy.orm import joinedload

from auth import CurrentUserId
from db import SessionDep
from models import (
  Card,
  CardReviewRequest,
  CardReviewResponse,
  ChangeToResultsPageResponse,
  CompleteStudySessionResponse,
  Deck,
  DeckMasteryResponse,
  NextCard,
  PrevCard,
  SyncStudyPage,
  SyncStudyPageResponse,
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
      .order_by(StudySessionCard.position.asc()))).scalars().all()
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
      position=existing_study_session.current_position,
      page=existing_study_session.page,
      mastery=mastery,
    )
  
  async def create_new_study_session():
    cards_due = list((await session.execute(select(Card).where(Card.deck_id == deck_id, Card.next_review_date <= datetime.utcnow()).limit(20))).scalars().all())
    shuffle(cards_due)
    study_session = StudySession(deck_id=deck_id, current_position=0, page="cards")
    session.add(study_session)
    await session.flush()
    study_cards: list[StudySessionCardResponse] = []
    for i, card in enumerate(cards_due):
      study_card = StudySessionCard(
        card_id=card.id,
        position=i,
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
      position=study_session.current_position,
      page=study_session.page,
      mastery=mastery,
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
  
  # existing_study_session = (await session.execute(
  #   select(StudySession)
  #   .options(joinedload(StudySession.cards))
  #   .where(StudySession.deck_id == deck_id)
  # )).scalar_one_or_none()

  # if existing_study_session is None:
  #   cards_due = list((await session.execute(select(Card).where(Card.deck_id == deck_id, Card.next_review_date <= datetime.utcnow()).limit(20))).scalars().all())
  #   shuffle(cards_due)
  #   study_session = StudySession(deck_id=deck_id, current_position=0, on_results_page=False)
  #   session.add(study_session)
  #   await session.flush()
  #   study_cards: list[StudySessionCardResponse] = []
  #   for i, card in enumerate(cards_due):
  #     study_card = StudySessionCard(
  #       card_id=card.id,
  #       position=i,
  #       study_session_id=study_session.id,
  #       rating=None,
  #     )
  #     session.add(study_card)
  #     await session.flush()
  #     study_cards.append(StudySessionCardResponse(
  #       id=study_card.card_id,
  #       question=card.question,
  #       answer=card.answer,
  #       rating=None,
  #     ))
  #   await session.commit()
  #   return StudySessionResponse(
  #     deck_id=deck_id,
  #     cards=study_cards,
  #     on_results_page=False,
  #   )
  # else:
  #   study_session_cards = (await session.execute(
  #     select(StudySessionCard).options(joinedload(StudySessionCard.card))
  #     .where(StudySessionCard.study_session_id == existing_study_session.id)
  #     .join(Card, StudySessionCard.card_id == Card.id))).scalars().all()
  #   return StudySessionResponse(
  #     deck_id=deck_id,
  #     cards = [
  #       StudySessionCardResponse(
  #         id=study_card.card_id,
  #         question=study_card.card.question,
  #         answer=study_card.card.answer,
  #         rating=study_card.rating,
  #       ) for study_card in study_session_cards
  #     ],
  #     on_results_page=existing_study_session.on_results_page,
  #   )
  # return [
  #   CardStudyResponse(
  #     card_id=card.id,
  #     question=card.question,
  #     answer=card.answer,
  #   ) for card in cards_due
  # ]
# cards ordered by ID
# rated cards first
# pick up from first unrated card


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
  
  study_session_card = (await session.execute(
    select(StudySessionCard)
    .options(joinedload(StudySessionCard.study_session))
    .where(StudySessionCard.card_id == card_id)
  )).scalar_one_or_none()
  if not study_session_card:
    raise HTTPException(status_code=404, detail="Card not found")
  
  if study_session_card.rating is not None:
    # Already rated.
    # TODO: implement undo.
    return CardReviewResponse(
      id=card.id,
      repetition_count=card.repetition_count,
      easiness_factor=card.easiness_factor,
      interval=card.interval,
      next_review_date=card.next_review_date,
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

  study_session = study_session_card.study_session
  next_study_session_card = (await session.execute(
    select(StudySessionCard)
    .where(StudySessionCard.study_session_id == study_session.id, StudySessionCard.position > study_session.current_position)
    .order_by(StudySessionCard.position.asc())
    .limit(1)
  )).scalar_one_or_none()
  if next_study_session_card:
    study_session.current_position = next_study_session_card.position

  await session.commit()
  await session.refresh(card)

  return CardReviewResponse(
    id=card.id,
    repetition_count=card.repetition_count,
    easiness_factor=card.easiness_factor,
    interval=card.interval,
    next_review_date=card.next_review_date,
  )

@router.patch("/api/decks/{deckId}/next_card")
async def next_card(
  deck_id: Annotated[int, Path(alias="deckId")],
  body: NextCard,
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")

  study_session_card = (await session.execute(
    select(StudySessionCard)
    .options(joinedload(StudySessionCard.study_session))
    .where(StudySessionCard.card_id == body.card_id)
  )).scalar_one_or_none()
  if not study_session_card:
    raise HTTPException(status_code=404, detail="Card not found")

  study_session = study_session_card.study_session
  next_study_session_card = (await session.execute(
    select(StudySessionCard)
    .where(StudySessionCard.study_session_id == study_session.id, StudySessionCard.position > study_session.current_position)
    .order_by(StudySessionCard.position.asc())
    .limit(1)
  )).scalar_one_or_none()
  if next_study_session_card:
    study_session.current_position = next_study_session_card.position

  await session.commit()

@router.patch("/api/decks/{deckId}/prev_card")
async def prev_card(
  deck_id: Annotated[int, Path(alias="deckId")],
  body: PrevCard,
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")

  study_session_card = (await session.execute(
    select(StudySessionCard)
    .options(joinedload(StudySessionCard.study_session))
    .where(StudySessionCard.card_id == body.card_id)
  )).scalar_one_or_none()
  if not study_session_card:
    raise HTTPException(status_code=404, detail="Card not found")

  study_session = study_session_card.study_session
  next_study_session_card = (await session.execute(
    select(StudySessionCard)
    .where(StudySessionCard.study_session_id == study_session.id, StudySessionCard.position < study_session.current_position)
    .order_by(StudySessionCard.position.desc())
    .limit(1)
  )).scalar_one_or_none()
  if next_study_session_card:
    study_session.current_position = next_study_session_card.position

  await session.commit()

@router.patch("/api/decks/{deckId}/study/page", response_model=SyncStudyPageResponse)
async def sync_study_page(
  deck_id: Annotated[int, Path(alias="deckId")],
  body: SyncStudyPage,
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
  study_session.page = body.page
  await session.commit()
  return SyncStudyPageResponse(success=True)

@router.patch("/api/decks/{deckId}/study/toResultsPage", response_model=ChangeToResultsPageResponse)
async def change_to_results_page(
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  deck = (await session.execute(
    select(Deck)
    .options(joinedload(Deck.cards))
    .where(Deck.id == deck_id)
  )).scalar_one_or_none()
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")

  mastery = calculate_deck_mastery(deck.cards)
  
  study_session = (await session.execute(
    select(StudySession)
    .where(StudySession.deck_id == deck_id)
  )).scalar_one_or_none()
  if study_session is None:
    raise HTTPException(status_code=404, detail="Study session not found")
  study_session.page = "results"
  await session.commit()
  return ChangeToResultsPageResponse(mastery=mastery)

@router.patch("/api/decks/{deckId}/study/toCardsPage", response_model=SyncStudyPageResponse)
async def change_to_cards_page(
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
  study_session.page = "cards"
  await session.commit()
  return SyncStudyPageResponse(success=True)


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
