# Database models and API schemas.

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column, relationship

class Base(MappedAsDataclass, DeclarativeBase):
  pass

class Deck(Base):
  __tablename__ = "deck"

  id: Mapped[int] = mapped_column(init=False, primary_key=True)
  user_id: Mapped[str]
  name: Mapped[str]
  description: Mapped[str]
  due_date: Mapped[Optional[datetime]]
  last_studied_at: Mapped[Optional[datetime]]
  mastery: Mapped[Optional[int]]
  cards: Mapped[List["Card"]] = relationship(default_factory=list, back_populates="deck", cascade="all, delete-orphan", passive_deletes=True)

class Card(Base):
  __tablename__ = "card"

  id: Mapped[int] = mapped_column(init=False, primary_key=True)
  deck_id: Mapped[int] = mapped_column(ForeignKey("deck.id", ondelete="CASCADE"))
  question: Mapped[str]
  answer: Mapped[str]
  # SM-2 scheduling state
  repetition_count: Mapped[int] = mapped_column(default=0)
  easiness_factor: Mapped[float] = mapped_column(default=2.5)
  interval: Mapped[int] = mapped_column(default=0)
  next_review_date: Mapped[datetime] = mapped_column(default_factory=datetime.utcnow, server_default=func.now())
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
  description: str | None
  due_date: datetime | None
  mastery: int
  cards_due_today: int
  total_cards: int
  last_studied_at: datetime | None

class CardCreate(APISchema):
  question: str
  answer: str

class DeckCreate(APISchema):
  name: str
  description: str
  due_date: datetime | None = None
  last_studied_at: datetime | None = None
  mastery: int = 0
  cards: list[CardCreate] = Field(min_length=1)

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

class DeckMasteryResponse(APISchema):
  mastery_percentage: float

class DeckUploadResponse(APISchema):
  deck_id: int
  cards_created: int
  message: str

class CardListResponse(APISchema):
  id: int
  question: str
  answer: str
  mastery_score: int
  next_review_date: datetime

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

class CardReviewRequest(APISchema):
  rating: str = Field(description='UI rating: "red", "yellow", or "green"')

class CardReviewResponse(APISchema):
  id: int
  repetition_count: int
  easiness_factor: float
  interval: int
  next_review_date: datetime
