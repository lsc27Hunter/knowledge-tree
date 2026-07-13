import csv
from datetime import datetime
from io import StringIO
from typing import Annotated, Any, cast

from fastapi import FastAPI, Form, HTTPException, Path, UploadFile
from fastapi.routing import APIRoute
from sqlalchemy import CursorResult, delete, select
from auth import CurrentUserId
from db import SessionDep
from models import Card, CardCreate, CardCreateResponse, CardDeleteResponse, CardListResponse, CardUpdate, CardUpdateResponse, Deck, DeckCreate, DeckCreateResponse, DeckDeleteResponse, DeckGetResponse, DeckListResponse, DeckUploadResponse

# For generating openapi.json.
# https://fastapi.tiangolo.com/advanced/generate-clients/#custom-generate-unique-id-function
def custom_generate_unique_id(route: APIRoute):
  try:
    return f"{route.tags[0]}-{route.name}"
  except IndexError:
    return route.name

app = FastAPI(
  docs_url='/api/docs',
  redoc_url='/api/redoc',
  openapi_url='/api/openapi.json',
  generate_unique_id_function=custom_generate_unique_id,
)


@app.get("/")
async def hello_root():
  return {"message": "Hello World"}

@app.get("/api/hello")
async def hello():
  return {"message": "Hello World"}

@app.get("/api/me")
async def get_me(user_id: CurrentUserId):
  return {"userId": user_id}

@app.get("/api/decks", response_model=list[DeckListResponse])
async def get_decks(session: SessionDep, user_id: CurrentUserId):
  decks = (await session.execute(select(Deck).where(Deck.user_id == user_id))).scalars().all()
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
async def create_deck(deck: DeckCreate, session: SessionDep, user_id: CurrentUserId):
  db_deck = Deck(
    user_id=user_id,
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

@app.get("/api/decks/{deckId}", response_model=DeckGetResponse)
async def get_deck(
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
  return DeckGetResponse(
    id=deck.id,
    name=deck.name,
    mastery=0,
    cards_due_today=0,
    total_cards=0,
    retention_rate=0,
  )

@app.delete("/api/decks/{deckId}", response_model=DeckDeleteResponse)
async def delete_deck(
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
  result = await session.execute(delete(Deck).where(Deck.id == deck_id))
  await session.commit()
  return DeckDeleteResponse(success=cast(CursorResult[Any], result).rowcount > 0)

@app.post("/api/decks/upload", response_model=DeckUploadResponse)
async def upload_deck(
  deck_name: Annotated[str, Form(alias="deckName")],
  file: UploadFile,
  session: SessionDep,
  user_id: CurrentUserId,
):
  db_deck = Deck(
    user_id=user_id,
    name=deck_name,
    description="",
    last_studied_at=None,
  )
  session.add(db_deck)
  await session.flush()
  deck_id = db_deck.id
  file_text = (await file.read()).decode()
  cards_created = 0
  for row in csv.reader(StringIO(file_text)):
    if len(row) != 2:
      continue
    [question, answer] = row
    db_card = Card(
      deck_id=deck_id,
      question=question,
      answer=answer,
      n=0,
      ef=0,
      i=0,
    )
    session.add(db_card)
    await session.commit()
    cards_created += 1
  
  return DeckUploadResponse(
    deck_id=deck_id,
    cards_created=cards_created,
    message="success",
  )

@app.post("/api/decks/{deckId}/cards", response_model=CardCreateResponse)
async def create_card(
  deck_id: Annotated[int, Path(alias="deckId")],
  card: CardCreate,
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
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

@app.get("/api/decks/{deckId}/cards", response_model=list[CardListResponse])
async def get_cards(
  deck_id: Annotated[int, Path(alias="deckId")],
  session: SessionDep,
  user_id: CurrentUserId,
):
  deck = await session.get(Deck, deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
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

@app.patch("/api/cards/{cardId}", response_model=CardUpdateResponse)
async def update_card(
  card_id: Annotated[int, Path(alias="cardId")],
  card: CardUpdate,
  session: SessionDep,
  user_id: CurrentUserId
):
  db_card = (await session.execute(select(Card).where(Card.id == card_id))).scalar_one_or_none()
  if not db_card:
    raise HTTPException(status_code=404, detail="Card not found")
  deck = await session.get(Deck, db_card.deck_id)
  if not deck or deck.user_id != user_id:
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

@app.delete("/api/cards/{cardId}", response_model=CardDeleteResponse)
async def delete_card(
  card_id: Annotated[int, Path(alias="cardId")],
  session: SessionDep,
  user_id: CurrentUserId
):
  db_card = (await session.execute(select(Card).where(Card.id == card_id))).scalar_one_or_none()
  if not db_card:
    raise HTTPException(status_code=404, detail="Card not found")
  deck = await session.get(Deck, db_card.deck_id)
  if not deck or deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Card not found")
  result = await session.execute(delete(Card).where(Card.id == card_id))
  await session.commit()
  return CardDeleteResponse(success=cast(CursorResult[Any], result).rowcount > 0)
