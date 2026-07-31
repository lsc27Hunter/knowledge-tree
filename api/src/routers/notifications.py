from __future__ import annotations
from datetime import datetime, time, timedelta
from itertools import chain
import random
from typing import Annotated, Sequence

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pywebpush import WebPushException, webpush_async
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from log import log
from auth import CurrentUserId
from db import SessionDep
from env import notifications_secret, vapid_private_key
from models import APISchema, Card, Deck, NotificationConditions, PushSubscription, PushSubscriptionData, SendNotificationsResponse, SendTestNotification, Settings


router = APIRouter(tags=["notifications"])

_bearer = HTTPBearer(scheme_name="Notifications", auto_error=False)

@router.post("/api/notifications/send", response_model=SendNotificationsResponse)
async def send_notifications(
  session: SessionDep,
  _: CheckNotificationsSecret,
  host: Host,
):
  return await send_notifications_helper(
    session=session,
    host=host,
    scheduled=True,
  )

@router.post("/api/notifications/send-test", response_model=SendNotificationsResponse)
async def send_test_notifications(
  session: SessionDep,
  _: CheckNotificationsSecret,
  host: Host,
):
  return await send_notifications_helper(
    session=session,
    host=host,
    scheduled=False,
  )

async def send_notifications_helper(
  session: AsyncSession,
  host: str,
  scheduled: bool,
) -> SendNotificationsResponse:
  sub = get_sub(host)

  hour = datetime.utcnow().hour
  t0 = time(hour=hour)
  t1 = time.max.replace(hour=hour)

  sent = 0
  expired_or_invalid = 0

  settings_query = (
    select(Settings).where(Settings.notification_time >= t0, Settings.notification_time <= t1)
  ) if scheduled else select(Settings)

  # Settingses - the plural of settings.
  settingses = (await session.execute(settings_query)).scalars().all()

  for settings in settingses:
    push_subscriptions = (await session.execute(
      select(PushSubscription)
      .where(PushSubscription.settings_id == settings.id, PushSubscription.host == host)
    )).scalars().all()
    if len(push_subscriptions) == 0:
      continue
    deck_names = await get_notification_deck_names(
      session=session,
      user_id=settings.user_id,
      notification_conditions=NotificationConditions.from_settings(settings),
    )
    if len(deck_names) == 0:
      continue
    for subscription in push_subscriptions:
      try:
        await send_push_message(
          subscription=PushSubscriptionData.from_db(subscription),
          data=get_notification_message(deck_names).model_dump_json(),
          sub=sub,
        )
        sent += 1
      except WebPushException as e:
        status_code = e.response.status if e.response else None
        if status_code == 404 or status_code == 410:
          # Subscription expired or no longer valid.
          # https://web.dev/articles/sending-messages-with-web-push-libraries#sending_push_messages
          
          await session.delete(subscription)
          await session.commit()
          expired_or_invalid += 1
        else:
          raise e

  log.info(f"{sent} notifications sent, {expired_or_invalid} subscriptions expired or invalid")
  return SendNotificationsResponse(
    sent=sent,
    expired_or_invalid=expired_or_invalid,
  )

@router.post("/api/notifications/test")
async def send_test_notification(
  session: SessionDep,
  user_id: CurrentUserId,
  body: SendTestNotification,
  host: Host,
):
  sub = get_sub(host)
  subscription = body.push_subscription

  deck_names = await get_notification_deck_names(
    session=session,
    user_id=user_id,
    notification_conditions=body.notification_conditions,
  )

  await send_push_message(
    subscription=subscription,
    data=get_notification_message(deck_names).model_dump_json(),
    sub=sub,
  )

@router.post("/api/notifications/test-response")
async def handle_test_notification_response(
  subscription: "PushSubscriptionData | None",
):
  log.info(f"Received test notification response: {subscription}")

async def send_push_message(
  subscription: PushSubscriptionData,
  data: str,
  sub: str,
):
  """Raises pywebpush.WebPushException if the subscription is expired or invalid."""

  await webpush_async(
    subscription_info=subscription.model_dump(),
    data=data,

    # https://github.com/web-push-libs/vapid/tree/main/python
    # 'aud' and 'exp' auto-filled; https://github.com/web-push-libs/pywebpush/issues/69#issuecomment-313442688
    vapid_claims={
      "sub": sub,
    },

    vapid_private_key=vapid_private_key,
  
    # Without this, the push message might be dropped if the app isn't running on the mobile device.
    headers={
      "Urgency": "high",
    },
  )

async def get_notification_deck_names(
  session: AsyncSession,
  user_id: str,
  notification_conditions: NotificationConditions,
):
  sequences: list[Sequence[str]] = []
  if notification_conditions.deck.enabled:
    sequence = (await session.execute(
      select(Deck.name)
      .join(Card, Card.deck_id == Deck.id)
      .where(Deck.user_id == user_id, Card.next_review_date <= datetime.utcnow() - timedelta(days=notification_conditions.deck.days))
      .group_by(Deck.id, Deck.name)
      .having(func.count(Card.id) >= notification_conditions.deck.cards)
    )).scalars().all()
    sequences.append(sequence)
  if notification_conditions.card.enabled:
    sequence = (await session.execute(
      select(Deck.name)
      .join(Card, Card.deck_id == Deck.id)
      .where(Deck.user_id == user_id, Card.next_review_date <= datetime.utcnow() - timedelta(days=notification_conditions.card.days))
      .group_by(Deck.id, Deck.name)
    )).scalars().all()
    sequences.append(sequence)
  if notification_conditions.streak.enabled:
    # TODO
    pass
  deck_names: set[str] = set()
  for deck_name in chain(*sequences):
    deck_names.add(deck_name)
  return deck_names

def get_notification_message(deck_names: set[str]) -> PushMessage:
  if len(deck_names) == 0:
    return PushMessage(
      title="No alerts!",
      body=None,
    )
  else:
    random_deck_name = random.choice(list(deck_names))
    others = len(deck_names) - 1
    if others == 0:
      body = f"'{random_deck_name}' is due."
    else:
      body = f"'{random_deck_name}' and {others} others are due."
    return PushMessage(
      title="Review",
      body=body,
    )

def check_notifications_secret(
  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
):
  if credentials is None or credentials.credentials != notifications_secret:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

def get_host(host: Annotated[str | None, Header()] = None):
  if host is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host header not found")
  return host

def get_sub(host: str):
  if host.startswith("localhost:"):
    return "https://localhost"
  else:
    return f"https://{host}"

CheckNotificationsSecret = Annotated[None, Depends(check_notifications_secret)]
Host = Annotated[str, Depends(get_host)]

class PushMessage(APISchema):
  title: str
  body: str | None