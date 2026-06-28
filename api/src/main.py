from datetime import datetime

from fastapi import FastAPI, HTTPException
from sqlmodel import col, delete, select
from db import SessionDep
from models import Card, CardDeleteResponse, CardListResponse, CardUpdate, CardUpdateResponse, Deck, DeckCreate, DeckCreateResponse, DeckDeleteResponse, DeckGetResponse, DeckListResponse

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
  decks = (await session.exec(select(Deck))).all()
  return [
    DeckListResponse(
      mastery=0,
      cards_due_today=0,
      total_cards=0,
      **deck.model_dump(),
    ) for deck in decks
  ]

@app.post("/api/decks", response_model=DeckCreateResponse)
async def create_deck(deck: DeckCreate, session: SessionDep):
  db_deck = Deck(
    user_id="marcorubio",
    last_studied_at=None,
    **deck.model_dump()
  )
  session.add(db_deck)
  await session.commit()
  await session.refresh(db_deck)
  return db_deck

@app.get("/api/decks/{deck_id}", response_model=DeckGetResponse)
async def get_deck(deck_id: int, session: SessionDep):
  deck = await session.get(Deck, deck_id)
  if not deck:
    raise HTTPException(status_code=404, detail="Deck not found")
  return deck

@app.delete("/api/decks/{deck_id}", response_model=DeckDeleteResponse)
async def delete_deck(deck_id: int, session: SessionDep):
  result = await session.exec(delete(Deck).where(col(Deck.id) == deck_id))
  await session.commit()
  return DeckDeleteResponse(success=result.rowcount > 0)

@app.get("/api/decks/{deck_id}/cards", response_model=list[CardListResponse])
async def get_cards(deck_id: int, session: SessionDep):
  cards = (await session.exec(select(Card).where(col(Card.deck_id) == deck_id))).all()
  return [
    CardListResponse(
      mastery_score=0,
      next_review_date=datetime.now(),
      **card.model_dump(),
    ) for card in cards
  ]

@app.patch("/api/cards/{card_id}", response_model=list[CardUpdateResponse])
async def update_card(card_id: int, card: CardUpdate, session: SessionDep):
  db_card = (await session.exec(select(Card).where(col(Card.id) == card_id))).one_or_none()
  if not db_card:
    raise HTTPException(status_code=404, detail="Card not found")
  fields = card.model_dump(exclude_unset=True)
  db_card.sqlmodel_update(fields)
  session.add(db_card)
  await session.commit()
  await session.refresh(db_card)
  return db_card

@app.delete("/api/cards/{card_id}", response_model=CardDeleteResponse)
async def delete_card(card_id: int, session: SessionDep):
  result = await session.exec(delete(Card).where(col(Card.id) == card_id))
  await session.commit()
  return CardDeleteResponse(success=result.rowcount > 0)