from datetime import datetime
import json

from conftest import user_id
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import Card, CardCreate, CardDeckUpdate, CardUpdate, Deck, DeckUpdate

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
