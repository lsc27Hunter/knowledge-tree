# Database models and API schemas.

from datetime import datetime
from typing import List, Literal, Optional

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
  discoverable: Mapped[bool] = mapped_column(default=False)
  cards: Mapped[List["Card"]] = relationship(default_factory=list, back_populates="deck", cascade="all, delete-orphan", passive_deletes=True)
  study_session: Mapped[Optional["StudySession"]] = relationship(init=False)

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
  study_session_card: Mapped[Optional["StudySessionCard"]] = relationship(back_populates="card", init=False)

class StudySession(Base):
  __tablename__ = "study_session"

  id: Mapped[int] = mapped_column(init=False, primary_key=True)
  deck_id: Mapped[int] = mapped_column(ForeignKey("deck.id", ondelete="CASCADE"), unique=True)
  old_mastery: Mapped[float]
  cards: Mapped[List["StudySessionCard"]] = relationship(init=False)

class StudySessionCard(Base):
  __tablename__ = "study_session_card"

  id: Mapped[int] = mapped_column(init=False, primary_key=True)
  card_id: Mapped[int] = mapped_column(ForeignKey("card.id", ondelete="CASCADE"))
  index: Mapped[int]
  study_session_id: Mapped[int] = mapped_column(ForeignKey("study_session.id", ondelete="CASCADE"))
  rating: Mapped[Optional[Literal["red", "yellow", "green"]]]
  card: Mapped["Card"] = relationship(back_populates="study_session_card", init=False)
  study_session: Mapped["StudySession"] = relationship(back_populates="cards", init=False)

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
  creator_user_id: str
  creator_username: str | None
  creator_display_name: str
  name: str
  description: str | None
  due_date: datetime | None
  mastery: int
  cards_due_today: int
  next_review_date: datetime | None
  discoverable: bool
  total_cards: int
  last_studied_at: datetime | None
  active_study_session: bool

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
  discoverable: bool = False

class DeckCreateResponse(APISchema):
  id: int
  name: str
  description: str
  discoverable: bool

class DeckUpdate(APISchema):
  name: str
  description: str
  discoverable: bool
  due_date: datetime | None
  cards: list["CardDeckUpdate"] = Field(min_length=1)

class CardDeckUpdate(APISchema):
  id: int | None
  question: str
  answer: str

class DeckUpdateResponse(APISchema):
  id: int
  name: str
  description: str
  discoverable: bool
  due_date: datetime | None

class DeckGetResponse(APISchema):
  id: int
  creator_user_id: str
  creator_username: str | None
  creator_display_name: str
  name: str
  description: str
  discoverable: bool
  due_date: datetime | None
  cards: list["CardDeckGetResponse"]
  mastery: int
  cards_due_today: int
  total_cards: int
  retention_rate: int

class CardDeckGetResponse(APISchema):
  id: int
  question: str
  answer: str

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
  rating: Literal["red", "yellow", "green"] = Field(description='UI rating: "red", "yellow", or "green"')

class CardReviewResponse(APISchema):
  id: int
  repetition_count: int
  easiness_factor: float
  interval: int
  next_review_date: datetime
  mastery: float
  cards_left: bool

class StudySessionResponse(APISchema):
  deck_id: int
  cards: list["StudySessionCardResponse"]
  index: int
  page: Literal["cards", "results"]
  mastery: float
  old_mastery: float
  cards_left: bool

class StudySessionCardResponse(APISchema):
  id: int
  question: str
  answer: str
  rating: Literal["red", "yellow", "green"] | None


class CompleteStudySessionResponse(APISchema):
  success: bool
