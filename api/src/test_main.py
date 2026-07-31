# https://fastapi.tiangolo.com/tutorial/testing
# https://fastapi.tiangolo.com/advanced/testing-dependencies
# https://fastapi.tiangolo.com/advanced/async-tests
# https://sqlmodel.tiangolo.com/tutorial/fastapi/tests

from datetime import datetime, timedelta
import json
import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from testcontainers.postgres import PostgresContainer

# Override environment variables to prevent crashing when env is imported.
os.environ["DATABASE_URL"] = "postgresql://"
os.environ["CLERK_SECRET_KEY"] = "test_clerk_secret_key"
os.environ["VAPID_PRIVATE_KEY"] = "test_vapid_private_key"
os.environ["NOTIFICATIONS_SECRET"] = "test_notifications_secret"

from auth import get_current_user_id
from db import get_session
from main import app

from models import Base, Card, CardCreate, CardDeckUpdate, CardUpdate, Deck, DeckUpdate, UserStudyDay

from routers.notifications import check_notifications_secret


user_id = "test_user_id"

# Tests

async def test_get_decks(session: AsyncSession, client: AsyncClient):
  decks = [
    Deck(
      user_id=user_id,
      name="deck1",
      description="description1",
      last_studied_at=None,
      due_date=datetime.now()
    ),
    Deck(
      user_id=user_id,
      name="deck2",
      description="description2",
      last_studied_at=datetime.now(),
      due_date=None,
    ),
  ]
  for deck in decks:
    session.add(deck)
  await session.commit()

  response = await client.get("/api/decks")
  data = response.json()

  assert response.status_code == 200
  assert len(data) == len(decks)
  for deck in decks:
    matched = None
    for res_deck in data:
      if res_deck["id"] == deck.id:
        matched = res_deck
        break
    assert matched is not None
    assert matched["name"] == deck.name
    assert matched["description"] == deck.description
    assert matched["dueDate"] == None if deck.due_date is None else deck.due_date.isoformat()
    assert matched["lastStudiedAt"] == None if deck.last_studied_at is None else deck.last_studied_at.isoformat()
    assert matched["mastery"] == 0
    assert matched["cardsDueToday"] == 0
    assert matched["totalCards"] == 0
    assert matched["activeStudySession"] == False
    assert matched["creatorUserId"] == user_id
    assert matched["creatorDisplayName"] is not None

async def test_create_deck(client: AsyncClient):
  response = await client.post(
    "/api/decks",
    json={
      "name": "test name",
      "description": "test description",
      "cards": [
        {
          "question": "test question",
          "answer": "test answer",
        },
      ],
    },
  )
  data = response.json()

  assert response.status_code == 200
  assert data["name"] == "test name"
  assert data["description"] == "test description"
  assert data["id"] is not None

async def test_get_deck(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()

  response = await client.get(f"/api/decks/{deck.id}")
  data = response.json()

  assert response.status_code == 200
  assert data["name"] == deck.name
  assert data["mastery"] == 0
  assert data["cardsDueToday"] == 0
  assert data["totalCards"] == 0
  assert data["retentionRate"] == 0
  assert data["id"] == deck.id

async def test_update_deck(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()

  deck_id = deck.id

  deck = DeckUpdate(
    name="new name",
    description="new description",
    discoverable=True,
    due_date=datetime.now(),
    cards=[
      CardDeckUpdate(
        id=None,
        question="new question",
        answer="new answer",
      ),
    ],
  )
  response = await client.patch(
    f"/api/decks/{deck_id}",
    json=json.loads(deck.model_dump_json()),
  )
  data = response.json()

  assert response.status_code == 200
  assert data["name"] == deck.name
  assert data["description"] == deck.description
  assert data["discoverable"] is True
  assert data["dueDate"] == None if deck.due_date is None else deck.due_date.isoformat()
  assert data["id"] == deck_id


async def test_delete_deck(session: AsyncSession, client: AsyncClient):
    deck = Deck(
      user_id=user_id,
      name="test name",
      description="test description",
      last_studied_at=None,
      due_date=datetime.now()
    )
    session.add(deck)
    await session.commit()

    response = await client.delete(f"/api/decks/{deck.id}")

    data = response.json()
    deck_in_db = await session.get(Deck, deck.id)

    assert response.status_code == 200
    assert data["success"] == True
    assert deck_in_db is None

async def test_create_card(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()

  card = CardCreate(
    question="test question",
    answer="test answer",
  )
  response = await client.post(
    f"/api/decks/{deck.id}/cards",
    json=json.loads(card.model_dump_json()),
  )
  data = response.json()

  assert response.status_code == 200
  assert data["question"] == card.question
  assert data["answer"] == card.answer
  assert data["id"] is not None

async def test_get_cards(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()

  cards = [
    Card(
      deck_id=deck.id,
      question="question1",
      answer="answer1",
    ),
    Card(
      deck_id=deck.id,
      question="question2",
      answer="answer2",
    ),
  ]
  for card in cards:
    session.add(card)
  await session.commit()

  response = await client.get(f"/api/decks/{deck.id}/cards")
  data = response.json()

  assert response.status_code == 200
  assert len(data) == len(cards)
  for card in cards:
    matched = None
    for res_card in data:
      if res_card["id"] == card.id:
        matched = res_card
        break
    assert matched is not None
    assert matched["question"] == card.question
    assert matched["answer"] == card.answer
    assert matched["nextReviewDate"] == card.next_review_date.isoformat()
    assert matched["masteryScore"] == 0

async def test_update_card(session: AsyncSession, client: AsyncClient):
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
  card_id = card.id

  card = CardUpdate(
    question="new question",
    answer="new answer",
  )
  response = await client.patch(
    f"/api/cards/{card_id}",
    json=json.loads(card.model_dump_json()),
  )
  data = response.json()

  assert response.status_code == 200
  assert data["question"] == card.question
  assert data["answer"] == card.answer
  assert data["id"] == card_id

async def test_delete_card(session: AsyncSession, client: AsyncClient):
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

  response = await client.delete(f"/api/cards/{card.id}")

  data = response.json()
  card_in_db = await session.get(Card, card.id)

  assert response.status_code == 200
  assert data["success"] == True
  assert card_in_db is None

async def test_study(session: AsyncSession, client: AsyncClient):
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
  assert data["cardsLeft"] == 1


async def test_get_streak_defaults(client: AsyncClient):
  response = await client.get("/api/me/streak")
  data = response.json()

  assert response.status_code == 200
  assert data["currentStreak"] == 0
  assert data["longestStreak"] == 0
  assert data["todayReviewsCount"] == 0
  assert data["todayUniqueCardsCount"] == 0
  assert data["minimumCardsPerDay"] == 3
  assert data["qualifiesToday"] == False


async def test_review_card_updates_streak(session: AsyncSession, client: AsyncClient):
  deck = Deck(
    user_id=user_id,
    name="test name",
    description="test description",
    last_studied_at=None,
    due_date=datetime.now()
  )
  session.add(deck)
  await session.commit()

  for i in range(3):
    session.add(Card(
      deck_id=deck.id,
      question=f"question{i}",
      answer=f"answer{i}",
    ))
  await session.commit()

  study_response = await client.post(f"/api/decks/{deck.id}/study")
  study_data = study_response.json()
  assert study_response.status_code == 200

  for study_card in study_data["cards"]:
    review_response = await client.post(
      f"/api/cards/{study_card['id']}/review",
      json={"rating": "green"},
    )
    assert review_response.status_code == 200

  row_count = (await session.execute(select(UserStudyDay))).scalars().all()
  assert len(row_count) == 1
  assert row_count[0].reviews_count == 3
  assert row_count[0].unique_cards_count == 3
  assert row_count[0].qualifies_for_streak == True

  streak_response = await client.get("/api/me/streak")
  streak_data = streak_response.json()

  assert streak_response.status_code == 200
  assert streak_data["todayReviewsCount"] == 3
  assert streak_data["todayUniqueCardsCount"] == 3
  assert streak_data["qualifiesToday"] == True
  assert streak_data["currentStreak"] == 1
  assert streak_data["longestStreak"] == 1


async def test_get_streak_counts_consecutive_qualifying_days(session: AsyncSession, client: AsyncClient):
  today = datetime.utcnow().date()
  yesterday = today - timedelta(days=1)

  session.add_all([
    UserStudyDay(
      user_id=user_id,
      study_date=today,
      reviews_count=3,
      unique_cards_count=3,
      qualifies_for_streak=True,
    ),
    UserStudyDay(
      user_id=user_id,
      study_date=yesterday,
      reviews_count=3,
      unique_cards_count=3,
      qualifies_for_streak=True,
    ),
  ])
  await session.commit()

  response = await client.get("/api/me/streak")
  data = response.json()

  assert response.status_code == 200
  assert data["currentStreak"] == 2
  assert data["longestStreak"] == 2
  assert data["todayReviewsCount"] == 3
  assert data["todayUniqueCardsCount"] == 3
  assert data["qualifiesToday"] == True

# Fixtures

# https://anyio.readthedocs.io/en/stable/testing.html#using-async-fixtures-with-higher-scopes
@pytest.fixture(scope="session")
def anyio_backend():
  return "asyncio"

# Initialize and connect to postgres running in Docker.
@pytest.fixture(name="engine", scope="session")
async def engine_fixture():
  with PostgresContainer("postgres:16", driver="asyncpg") as postgres:
    engine = create_async_engine(postgres.get_connection_url())
    async with engine.begin() as conn:
      await conn.run_sync(Base.metadata.create_all)
      
    yield engine

# Provide a session that rolls back database changes after each test.
# https://docs.sqlalchemy.org/en/21/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites
@pytest.fixture(name="session")
async def session_fixture(engine: AsyncEngine):
  async with engine.connect() as connection:
    transaction = await connection.begin()
    
    async with AsyncSession(
      bind=connection,
      join_transaction_mode="create_savepoint",

      # Ensure database model data sticks around even after committing so we
      # can check it in tests.
      expire_on_commit=False,
    ) as session:
      yield session
    
    await transaction.rollback()

@pytest.fixture(name="client")
async def client_fixture(session: AsyncSession, monkeypatch: pytest.MonkeyPatch):
  def get_session_override():
    return session

  def get_current_user_id_override():
    return user_id

  def check_notifications_secret_override():
    return None

  # Deck list/detail pull creator names from Clerk — stub it in tests.
  monkeypatch.setattr(
    "main.get_clerk_user_profile",
    lambda _uid: {
      "username": "tester",
      "first_name": "Test",
      "last_name": "User",
    },
  )

  app.dependency_overrides[get_session] = get_session_override
  app.dependency_overrides[get_current_user_id] = get_current_user_id_override
  app.dependency_overrides[check_notifications_secret] = check_notifications_secret_override
  
  transport = ASGITransport(app=app)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    yield client
  
  app.dependency_overrides.clear()
