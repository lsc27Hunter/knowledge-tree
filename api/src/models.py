from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlmodel import Field, Relationship, SQLModel

# Translates camelCase request fields to snake_case.
# Translates snake_case response fields to camelCase.
class Model(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    validate_by_alias=True, # Allow alias as keyword argument
    validate_by_name=True, # Allow real name as keyword argument
    from_attributes=True,
  )

class Deck(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  user_id: str
  name: str
  description: str
  last_studied_at: datetime | None
  cards: list["Card"] = Relationship(back_populates="deck", passive_deletes=True)

class DeckListResponse(Model):
  id: int
  name: str
  mastery: int
  cards_due_today: int
  total_cards: int
  last_studied_at: datetime | None

class DeckCreate(Model):
  name: str
  description: str

class DeckCreateResponse(Model):
  id: int
  name: str
  description: str

class DeckGetResponse(Model):
  id: int
  name: str
  mastery: int
  cards_due_today: int
  total_cards: int
  retention_rate: int

class DeckDeleteResponse(Model):
  success: bool

class Card(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  deck_id: int = Field(foreign_key="deck.id", ondelete="CASCADE")
  question: str
  answer: str
  n: int
  ef: float
  i: int
  deck: Deck = Relationship(back_populates="cards")

class CardListResponse(Model):
  id: int
  question: str
  answer: str
  mastery_score: int
  next_review_date: datetime

class CardCreate(Model):
  question: str
  answer: str

class CardCreateResponse(Model):
  id: int
  question: str
  answer: str

class CardUpdate(Model):
  question: str | None = None
  answer: str | None = None

class CardUpdateResponse(Model):
  id: int
  question: str
  answer: str

class CardDeleteResponse(Model):
  success: bool