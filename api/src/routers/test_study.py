from datetime import datetime
import json

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from routers.study import create_new_study_session
from conftest import user_id
from models import Card, CardReviewRequest, Deck





from sqlalchemy import select
from sqlalchemy.orm import selectinload










async def test_study_create_new_study_session(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()

  card = Card(
    deck_id=deck.id,
    question="test question",
    answer="test answer",
  )
  session.add(card)
  await session.commit()

  response = await client.post(
    f"/api/decks/{deck.id}/study",
  )

  data = response.json()

  assert response.status_code == 200
  assert data["deckId"] == deck.id
  assert len(data["cards"]) == 1
  assert data["cards"][0]["question"] == card.question
  assert data["cards"][0]["answer"] == card.answer
  assert data["cards"][0]["rating"] is None
  assert data["index"] == 0
  assert data["page"] == "cards"
  assert data["mastery"] == 0
  assert data["oldMastery"] == 0
  assert data["cardsLeft"] == 0

async def test_review_card(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()
  await session.refresh(deck)

  card = Card(
    deck_id=deck.id,
    question="test question",
    answer="test answer",
  )
  session.add(card)
  await session.commit()

  await create_new_study_session(deck.id, user_id, session)

  card_review = CardReviewRequest(
    rating='green',
  )

  now = datetime.now()

  response = await client.post(
    f"/api/cards/{card.id}/review",
    json=json.loads(card_review.model_dump_json()),
  )

  data = response.json()

  assert response.status_code == 200
  assert data["id"] == card.id
  assert data["repetitionCount"] == 1
  assert data["easinessFactor"] > 0
  assert data["interval"] > 0
  assert datetime.fromisoformat(data["nextReviewDate"]) > now
  assert data["mastery"] > 0
  assert data["cardsLeft"] == 0
