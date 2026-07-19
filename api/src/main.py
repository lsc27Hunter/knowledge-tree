import csv
from datetime import datetime
from io import StringIO
from typing import Annotated, Any, cast

from fastapi import FastAPI, Form, HTTPException, Path, UploadFile
from fastapi.routing import APIRoute
from sqlalchemy import CursorResult, delete, select
from sqlalchemy.orm import selectinload
from auth import CurrentUserId
from db import SessionDep
from models import Card, CardCreate, CardCreateResponse, CardDeckGetResponse, CardDeleteResponse, CardListResponse, CardUpdate, CardUpdateResponse, Deck, DeckCreate, DeckCreateResponse, DeckDeleteResponse, DeckGetResponse, DeckListResponse, DeckUpdate, DeckUpdateResponse, DeckUploadResponse
from routers.study import router as study_router
from utils.mastery import calculate_deck_mastery, card_mastery

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

app.include_router(study_router)


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
  responses: list[DeckListResponse] = []
  for deck in decks:
    cards = (await session.execute(select(Card).where(Card.deck_id == deck.id))).scalars().all()
    now = datetime.utcnow()
    responses.append(
      DeckListResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        due_date=deck.due_date,
        last_studied_at=deck.last_studied_at,
        mastery=int(round(calculate_deck_mastery(cards))),
        cards_due_today=sum(1 for c in cards if c.next_review_date <= now),
        total_cards=len(cards),
      )
    )
  return responses

@app.post("/api/decks", response_model=DeckCreateResponse)
async def create_deck(deck: DeckCreate, session: SessionDep, user_id: CurrentUserId):
  db_deck = Deck(
    user_id=user_id,
    name=deck.name,
    description=deck.description,
    due_date=deck.due_date,
    last_studied_at=deck.last_studied_at,
  )
  session.add(db_deck)
  await session.flush()

  for card in deck.cards:
    session.add(Card(
      deck_id=db_deck.id,
      question=card.question,
      answer=card.answer,
      repetition_count=0,
      easiness_factor=2.5,
      interval=0,
    ))

  await session.commit()
  await session.refresh(db_deck)
  return DeckCreateResponse(
    id=db_deck.id,
    name=db_deck.name,
    description=db_deck.description,
  )

@app.patch("/api/decks/{deckId}", response_model=DeckUpdateResponse)
async def update_deck(
  deck_id: Annotated[int, Path(alias="deckId")],
  deck: DeckUpdate,
  session: SessionDep,
  user_id: CurrentUserId
):
  db_deck = (await session.execute(
    select(Deck)
    .options(selectinload(Deck.cards))
    .where(Deck.id == deck_id)
  )).scalar_one_or_none()
  if not db_deck or db_deck.user_id != user_id:
    raise HTTPException(status_code=404, detail="Deck not found")
  print("CLAR")
  db_deck.name = deck.name
  db_deck.description = deck.description
  db_deck.due_date = deck.due_date
  new_cards: list[Card] = []
  for card in deck.cards:
    new_card = Card(
      deck_id=deck_id,
      question=card.question,
      answer=card.answer,
    )
    if card.id is not None:
      new_card.id = card.id
      print("woot")
    new_cards.append(new_card)
  db_deck.cards = new_cards
    
  await session.commit()
  await session.refresh(db_deck)
  return DeckUpdateResponse(
    id=db_deck.id,
    name=db_deck.name,
    description=db_deck.description,
    due_date=db_deck.due_date,
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
  cards = (await session.execute(select(Card).where(Card.deck_id == deck_id))).scalars().all()
  now = datetime.utcnow()
  mastery = calculate_deck_mastery(cards)
  return DeckGetResponse(
    id=deck.id,
    name=deck.name,
    description=deck.description,
    due_date=deck.due_date,
    cards=[
      CardDeckGetResponse(
        id=card.id,
        question=card.question,
        answer=card.answer,
      ) for card in cards
    ],
    mastery=int(round(mastery)),
    cards_due_today=sum(1 for c in cards if c.next_review_date <= now),
    total_cards=len(cards),
    retention_rate=int(round(mastery)),
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
  due_date: Annotated[str | None, Form(alias="dueDate")] = None,
  description: Annotated[str, Form()] = "",
):
  parsed_due_date = (
    datetime.fromisoformat(due_date)
    if due_date
    else None
  )

  db_deck = Deck(
    user_id=user_id,
    name=deck_name,
    description=description,
    last_studied_at=None,
    due_date=parsed_due_date,
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
    repetition_count=0,
    easiness_factor=2.5,
    interval=0,
    next_review_date=datetime.utcnow(),
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
      mastery_score=int(round(card_mastery(card.interval) * 100)),
      next_review_date=card.next_review_date,
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
