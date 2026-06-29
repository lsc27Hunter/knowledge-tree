# Database models and API schemas.

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column, relationship

class Base(MappedAsDataclass, DeclarativeBase):
  pass

class Deck(Base):
  __tablename__ = "deck"

  id: Mapped[int] = mapped_column(init=False, primary_key=True)
  user_id: Mapped[str]
  name: Mapped[str]
  description: Mapped[str]
  last_studied_at: Mapped[Optional[datetime]]
  cards: Mapped[List["Card"]] = relationship(default_factory=list, back_populates="deck", cascade="all, delete-orphan", passive_deletes=True)

class Card(Base):
  __tablename__ = "card"

  id: Mapped[int] = mapped_column(init=False, primary_key=True)
  deck_id: Mapped[int] = mapped_column(ForeignKey("deck.id", ondelete="CASCADE"))
  question: Mapped[str]
  answer: Mapped[str]
  n: Mapped[int]
  ef: Mapped[float]
  i: Mapped[int]
  deck: Mapped["Deck"] = relationship(back_populates="cards", init=False)

# Translates camelCase request fields to snake_case.
# Translates snake_case response fields to camelCase.
class APISchema(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    validate_by_alias=True, # Allow alias as keyword argument
    validate_by_name=True, # Allow real name as keyword argument
    from_attributes=True,
  )

class DeckListResponse(APISchema):
  id: int
  name: str
  mastery: int
  cards_due_today: int
  total_cards: int
  last_studied_at: datetime | None

class DeckCreate(APISchema):
  name: str
  description: str

class DeckCreateResponse(APISchema):
  id: int
  name: str
  description: str

class DeckGetResponse(APISchema):
  id: int
  name: str
  mastery: int
  cards_due_today: int
  total_cards: int
  retention_rate: int

class DeckDeleteResponse(APISchema):
  success: bool

class CardListResponse(APISchema):
  id: int
  question: str
  answer: str
  mastery_score: int
  next_review_date: datetime

class CardCreate(APISchema):
  question: str
  answer: str

class CardCreateResponse(APISchema):
  id: int
  question: str
  answer: str

class CardUpdate(APISchema):
  question: str | None = None
  answer: str | None = None

class CardUpdateResponse(APISchema):
  id: int
  question: str
  answer: str

class CardDeleteResponse(APISchema):
  success: bool