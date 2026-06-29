from datetime import datetime
from typing import Any, cast

from fastapi import FastAPI, HTTPException
from sqlalchemy import CursorResult, delete, select
from db import SessionDep
from models import Card, CardCreate, CardCreateResponse, CardDeleteResponse, CardListResponse, CardUpdate, CardUpdateResponse, Deck, DeckCreate, DeckCreateResponse, DeckDeleteResponse, DeckGetResponse, DeckListResponse

app = FastAPI(
  docs_url='/api/docs',
  redoc_url='/api/redoc',
  openapi_url='/api/openapi.json'
)


@app.get("/")
@app.get("/api/hello")
async def root():
  return {"message": "Hello World"}

@app.get("/api/decks", response_model=list[DeckListResponse])
async def get_decks(session: SessionDep):
  decks = (await session.execute(select(Deck))).scalars().all()
  return [
    DeckListResponse(
      id=deck.id,
      name=deck.name,
      last_studied_at=deck.last_studied_at,
      mastery=0,
      cards_due_today=0,
      total_cards=0,
    ) for deck in decks
  ]

@app.post("/api/decks", response_model=DeckCreateResponse)
async def create_deck(deck: DeckCreate, session: SessionDep):
  db_deck = Deck(
    user_id="marcorubio",
    name=deck.name,
    description=deck.description,
    last_studied_at=None,
  )
  session.add(db_deck)
  await session.commit()
  await session.refresh(db_deck)
  return DeckCreateResponse(
    id=db_deck.id,
    name=db_deck.name,
    description=db_deck.description,
  )

@app.get("/api/decks/{deck_id}", response_model=DeckGetResponse)
async def get_deck(deck_id: int, session: SessionDep):
  deck = await session.get(Deck, deck_id)
  if not deck:
    raise HTTPException(status_code=404, detail="Deck not found")
  return DeckGetResponse(
    id=deck.id,
    name=deck.name,
    mastery=0,
    cards_due_today=0,
    total_cards=0,
    retention_rate=0,
  )

@app.delete("/api/decks/{deck_id}", response_model=DeckDeleteResponse)
async def delete_deck(deck_id: int, session: SessionDep):
  result = await session.execute(delete(Deck).where(Deck.id == deck_id))
  await session.commit()
  return DeckDeleteResponse(success=cast(CursorResult[Any], result).rowcount > 0)

@app.post("/api/decks/{deck_id}/cards", response_model=CardCreateResponse)
async def create_card(deck_id: int, card: CardCreate, session: SessionDep):
  db_card = Card(
    deck_id=deck_id,
    question=card.question,
    answer=card.answer,
    n=0,
    ef=0,
    i=0,
  )
  session.add(db_card)
  await session.commit()
  await session.refresh(db_card)
  return CardCreateResponse(
    id=db_card.id,
    question=db_card.question,
    answer=db_card.answer,
  )

@app.get("/api/decks/{deck_id}/cards", response_model=list[CardListResponse])
async def get_cards(deck_id: int, session: SessionDep):
  cards = (await session.execute(select(Card).where(Card.deck_id == deck_id))).scalars().all()
  return [
    CardListResponse(
      id=card.id,
      question=card.question,
      answer=card.answer,
      mastery_score=0,
      next_review_date=datetime.now(),
    ) for card in cards
  ]

@app.patch("/api/cards/{card_id}", response_model=CardUpdateResponse)
async def update_card(card_id: int, card: CardUpdate, session: SessionDep):
  db_card = (await session.execute(select(Card).where(Card.id == card_id))).scalar_one_or_none()
  if not db_card:
    raise HTTPException(status_code=404, detail="Card not found")
  updated_fields = card.model_dump(exclude_unset=True)
  for key, value in updated_fields.items():
    setattr(db_card, key, value)
  await session.commit()
  await session.refresh(db_card)
  return CardUpdateResponse(
    id=db_card.id,
    question=db_card.question,
    answer=db_card.answer,
  )

@app.delete("/api/cards/{card_id}", response_model=CardDeleteResponse)
async def delete_card(card_id: int, session: SessionDep):
  result = await session.execute(delete(Card).where(Card.id == card_id))
  await session.commit()
  return CardDeleteResponse(success=cast(CursorResult[Any], result).rowcount > 0)