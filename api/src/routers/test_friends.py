# Friends API tests.

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models import Deck, Card, Friendship


OTHER_USER = "friend_user_id"
STRANGER = "stranger_id"


async def _add_deck(
  session: AsyncSession,
  *,
  owner: str,
  name: str,
  discoverable: bool,
) -> Deck:
  deck = Deck(
    user_id=owner,
    name=name,
    description="",
    due_date=None,
    last_studied_at=None,
    discoverable=discoverable,
  )
  session.add(deck)
  await session.commit()
  await session.refresh(deck)
  session.add(Card(deck_id=deck.id, question="q", answer="a"))
  await session.commit()
  return deck


@pytest.mark.anyio
async def test_add_list_and_remove_friend(client: AsyncClient):
  add = await client.post(f"/api/friends/{OTHER_USER}")
  assert add.status_code == 200
  assert add.json()["isFriend"] is True

  listed = await client.get("/api/friends")
  assert listed.status_code == 200
  friends = listed.json()
  assert len(friends) == 1
  assert friends[0]["userId"] == OTHER_USER
  assert friends[0]["displayName"]

  add_again = await client.post(f"/api/friends/{OTHER_USER}")
  assert add_again.status_code == 200
  assert len((await client.get("/api/friends")).json()) == 1

  remove = await client.delete(f"/api/friends/{OTHER_USER}")
  assert remove.status_code == 200
  assert remove.json()["isFriend"] is False
  assert (await client.get("/api/friends")).json() == []


@pytest.mark.anyio
async def test_cannot_friend_self(client: AsyncClient):
  res = await client.post("/api/friends/test_user_id")
  assert res.status_code == 400


@pytest.mark.anyio
async def test_user_profile_and_discoverable_decks(
  client: AsyncClient,
  session: AsyncSession,
):
  await _add_deck(session, owner=OTHER_USER, name="Public Algo", discoverable=True)
  await _add_deck(session, owner=OTHER_USER, name="Secret", discoverable=False)

  profile = await client.get(f"/api/users/{OTHER_USER}")
  assert profile.status_code == 200
  body = profile.json()
  assert body["userId"] == OTHER_USER
  assert body["isSelf"] is False
  assert body["isFriend"] is False
  assert body["discoverableDeckCount"] == 1

  decks = await client.get(f"/api/users/{OTHER_USER}/decks")
  assert decks.status_code == 200
  names = [d["name"] for d in decks.json()]
  assert names == ["Public Algo"]

  await client.post(f"/api/friends/{OTHER_USER}")
  profile2 = await client.get(f"/api/users/{OTHER_USER}")
  assert profile2.json()["isFriend"] is True


@pytest.mark.anyio
async def test_discovery_prioritizes_friends_decks(
  client: AsyncClient,
  session: AsyncSession,
):
  await _add_deck(session, owner=OTHER_USER, name="Friend Deck", discoverable=True)
  await _add_deck(session, owner=STRANGER, name="Stranger Deck", discoverable=True)
  # Canonical order: friend_user_id < test_user_id
  session.add(Friendship(user_a_id=OTHER_USER, user_b_id="test_user_id"))
  await session.commit()

  res = await client.get("/api/discovery/decks")
  assert res.status_code == 200
  names = [d["name"] for d in res.json()]
  assert names[0] == "Friend Deck"
  assert "Stranger Deck" in names


@pytest.mark.anyio
async def test_user_study_activity_empty(client: AsyncClient):
  res = await client.get(f"/api/users/{OTHER_USER}/study-activity")
  assert res.status_code == 200
  body = res.json()
  assert body["days"] == []
  assert body["fromDate"]
  assert body["toDate"]
