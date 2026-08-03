# Friends and public user profiles.

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from auth import CurrentUserId, get_clerk_user_profile
from db import SessionDep
from models import (
  Deck,
  DeckListResponse,
  FriendActionResponse,
  FriendListItem,
  Friendship,
  PublicUserProfile,
  StudyActivityDay,
  StudyActivityResponse,
  UserStudyDay,
)
from utils.mastery import calculate_deck_mastery

router = APIRouter(tags=["friends"])


def ordered_friend_pair(user_id: str, other_id: str) -> tuple[str, str]:
  return (user_id, other_id) if user_id < other_id else (other_id, user_id)


def public_profile_fields(user_id: str) -> dict[str, str | None]:
  try:
    profile = get_clerk_user_profile(user_id)
  except Exception:
    return {
      "user_id": user_id,
      "username": None,
      "display_name": user_id,
      "image_url": None,
    }

  username = profile.get("username")
  first_name = profile.get("first_name")
  last_name = profile.get("last_name")
  display_name = (
    username
    or " ".join(part for part in [first_name, last_name] if part).strip()
    or user_id
  )
  return {
    "user_id": user_id,
    "username": username,
    "display_name": display_name,
    "image_url": profile.get("image_url"),
  }


async def are_friends(session: SessionDep, user_id: str, other_id: str) -> bool:
  a, b = ordered_friend_pair(user_id, other_id)
  row = (
    await session.execute(
      select(Friendship.id).where(
        Friendship.user_a_id == a,
        Friendship.user_b_id == b,
      )
    )
  ).scalar_one_or_none()
  return row is not None


async def friend_ids_for_user(session: SessionDep, user_id: str) -> set[str]:
  rows = (
    await session.execute(
      select(Friendship).where(
        or_(Friendship.user_a_id == user_id, Friendship.user_b_id == user_id)
      )
    )
  ).scalars().all()
  ids: set[str] = set()
  for row in rows:
    ids.add(row.user_b_id if row.user_a_id == user_id else row.user_a_id)
  return ids


async def _discoverable_deck_stats(session: SessionDep, owner_id: str) -> tuple[int, int]:
  decks = (
    await session.execute(
      select(Deck)
      .options(selectinload(Deck.cards))
      .where(Deck.user_id == owner_id, Deck.discoverable.is_(True))
    )
  ).scalars().all()
  if not decks:
    return 0, 0
  masteries = [calculate_deck_mastery(deck.cards) for deck in decks]
  avg = int(round(sum(masteries) / len(masteries)))
  return len(decks), avg


async def _current_streak(session: SessionDep, owner_id: str) -> int:
  today = datetime.utcnow().date()
  qualifying_days = list(
    (
      await session.execute(
        select(UserStudyDay.study_date)
        .where(
          UserStudyDay.user_id == owner_id,
          UserStudyDay.qualifies_for_streak.is_(True),
        )
        .order_by(UserStudyDay.study_date.asc())
      )
    ).scalars().all()
  )
  if not qualifying_days:
    return 0

  qualifying = set(qualifying_days)
  cursor = today if today in qualifying else today - timedelta(days=1)
  streak = 0
  while cursor in qualifying:
    streak += 1
    cursor -= timedelta(days=1)
  return streak


def _deck_list_item(deck: Deck, creator: dict[str, str | None]) -> DeckListResponse:
  cards = deck.cards
  now = datetime.utcnow()
  next_review_date = min((c.next_review_date for c in cards), default=None)
  return DeckListResponse(
    id=deck.id,
    creator_user_id=creator["creator_user_id"] or deck.user_id,
    creator_username=creator.get("creator_username"),
    creator_display_name=creator.get("creator_display_name") or deck.user_id,
    name=deck.name,
    description=deck.description,
    discoverable=deck.discoverable,
    due_date=deck.due_date,
    last_studied_at=deck.last_studied_at,
    mastery=int(round(calculate_deck_mastery(cards))),
    cards_due_today=sum(1 for c in cards if c.next_review_date <= now),
    next_review_date=next_review_date,
    total_cards=len(cards),
    active_study_session=False,
  )


@router.get("/api/friends", response_model=list[FriendListItem])
async def list_friends(session: SessionDep, user_id: CurrentUserId):
  ids = sorted(await friend_ids_for_user(session, user_id))
  items: list[FriendListItem] = []
  for friend_id in ids:
    fields = public_profile_fields(friend_id)
    deck_count, _ = await _discoverable_deck_stats(session, friend_id)
    items.append(
      FriendListItem(
        user_id=fields["user_id"] or friend_id,
        username=fields["username"],
        display_name=fields["display_name"] or friend_id,
        image_url=fields["image_url"],
        discoverable_deck_count=deck_count,
      )
    )
  return items


@router.post("/api/friends/{userId}", response_model=FriendActionResponse)
async def add_friend(
  session: SessionDep,
  user_id: CurrentUserId,
  other_id: Annotated[str, Path(alias="userId")],
):
  if other_id == user_id:
    raise HTTPException(status_code=400, detail="You can't add yourself as a friend")

  a, b = ordered_friend_pair(user_id, other_id)
  existing = (
    await session.execute(
      select(Friendship).where(
        Friendship.user_a_id == a,
        Friendship.user_b_id == b,
      )
    )
  ).scalar_one_or_none()

  if existing is None:
    session.add(Friendship(user_a_id=a, user_b_id=b))
    await session.commit()

  return FriendActionResponse(user_id=other_id, is_friend=True)


@router.delete("/api/friends/{userId}", response_model=FriendActionResponse)
async def remove_friend(
  session: SessionDep,
  user_id: CurrentUserId,
  other_id: Annotated[str, Path(alias="userId")],
):
  if other_id == user_id:
    raise HTTPException(status_code=400, detail="You can't remove yourself")

  a, b = ordered_friend_pair(user_id, other_id)
  existing = (
    await session.execute(
      select(Friendship).where(
        Friendship.user_a_id == a,
        Friendship.user_b_id == b,
      )
    )
  ).scalar_one_or_none()
  if existing is not None:
    await session.delete(existing)
    await session.commit()

  return FriendActionResponse(user_id=other_id, is_friend=False)


@router.get("/api/users/{userId}", response_model=PublicUserProfile)
async def get_user_profile(
  session: SessionDep,
  viewer_id: CurrentUserId,
  other_id: Annotated[str, Path(alias="userId")],
):
  fields = public_profile_fields(other_id)
  deck_count, avg_mastery = await _discoverable_deck_stats(session, other_id)
  is_self = viewer_id == other_id
  is_friend = False if is_self else await are_friends(session, viewer_id, other_id)
  streak = await _current_streak(session, other_id)

  return PublicUserProfile(
    user_id=fields["user_id"] or other_id,
    username=fields["username"],
    display_name=fields["display_name"] or other_id,
    image_url=fields["image_url"],
    is_self=is_self,
    is_friend=is_friend,
    discoverable_deck_count=deck_count,
    average_mastery=avg_mastery,
    current_streak=streak,
  )


@router.get("/api/users/{userId}/decks", response_model=list[DeckListResponse])
async def get_user_discoverable_decks(
  session: SessionDep,
  _viewer_id: CurrentUserId,
  other_id: Annotated[str, Path(alias="userId")],
):
  decks = (
    await session.execute(
      select(Deck)
      .options(selectinload(Deck.cards))
      .where(Deck.user_id == other_id, Deck.discoverable.is_(True))
      .order_by(Deck.name.asc())
    )
  ).scalars().all()

  fields = public_profile_fields(other_id)
  creator_meta = {
    "creator_user_id": other_id,
    "creator_username": fields["username"],
    "creator_display_name": fields["display_name"] or other_id,
  }
  return [_deck_list_item(deck, creator_meta) for deck in decks]


@router.get("/api/users/{userId}/study-activity", response_model=StudyActivityResponse)
async def get_user_study_activity(
  session: SessionDep,
  _viewer_id: CurrentUserId,
  other_id: Annotated[str, Path(alias="userId")],
  weeks: int = 53,
):
  weeks = max(1, min(weeks, 53))
  today = datetime.utcnow().date()
  days_since_sunday = (today.weekday() + 1) % 7
  end = today
  start = end - timedelta(days=days_since_sunday + 7 * (weeks - 1))

  rows = list(
    (
      await session.execute(
        select(UserStudyDay)
        .where(
          UserStudyDay.user_id == other_id,
          UserStudyDay.study_date >= start,
          UserStudyDay.study_date <= end,
        )
        .order_by(UserStudyDay.study_date.asc())
      )
    ).scalars().all()
  )

  return StudyActivityResponse(
    from_date=start,
    to_date=end,
    days=[
      StudyActivityDay(
        date=row.study_date,
        reviews_count=row.reviews_count,
        unique_cards_count=row.unique_cards_count,
        qualifies_for_streak=row.qualifies_for_streak,
      )
      for row in rows
    ],
  )
