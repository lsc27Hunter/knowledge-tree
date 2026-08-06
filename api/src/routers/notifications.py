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
from routers.study import calculate_current_streak
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
  """Called by a cron job to send notifications to all users who are scheduled for them."""
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
  """
  Testing-only. Send a notification to all users according to their settings but
  regardless of their scheduled time for notifications.
  """
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

  # The start and end of the hour.
  t0 = time(hour=hour)
  t1 = time.max.replace(hour=hour)

  sent = 0
  expired_or_invalid = 0

  # The settings of each user whose notification time is set within this hour.
  settings_query = (
    select(Settings).where(Settings.notification_time >= t0, Settings.notification_time <= t1)
  ) if scheduled else select(Settings)

  settings_list = (await session.execute(settings_query)).scalars().all()

  for settings in settings_list:
    push_subscriptions = (await session.execute(
      select(PushSubscription)
      .where(PushSubscription.settings_id == settings.id, PushSubscription.host == host)
    )).scalars().all()
    if len(push_subscriptions) == 0:
      continue
    deck_names, streak_condition, streak = await get_notification_deck_names(
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
          data=get_notification_message(deck_names, streak_condition, streak).model_dump_json(),
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
  """Allow the user to see what kind of notification will come from their current notification settings."""
  sub = get_sub(host)
  subscription = body.push_subscription

  deck_names, streak_condition, streak = await get_notification_deck_names(
    session=session,
    user_id=user_id,
    notification_conditions=body.notification_conditions,
  )

  await send_push_message(
    subscription=subscription,
    data=get_notification_message(deck_names, streak_condition, streak).model_dump_json(),
    sub=sub,
  )

@router.post("/api/notifications/test-response")
async def handle_test_notification_response(
  subscription: "PushSubscriptionData | None",
):
  """
  When the client receives a push message, it can respond to this endpoint to prove delivery.
  Used only for testing.
  """
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

    # On mobile devices, push messages might be discarded if the app isn't running. This prevents that.
    headers={
      "Urgency": "high",
    },
  )

async def get_notification_deck_names(
  session: AsyncSession,
  user_id: str,
  notification_conditions: NotificationConditions,
) -> tuple[set[str], bool, int]:
  """The deck names that could possibly appear in the notification."""
  sequences: list[Sequence[str]] = []
  streak = await calculate_current_streak(session, user_id)
  if notification_conditions.streak.enabled:
    streak_condition = streak >= notification_conditions.streak.days
  else:
    streak_condition = False

  if streak_condition:
    # If we're notifying the user about a streak, we'll just tell them about all the decks ready
    # for review, even if they don't strictly fit the user's notification settings.
    sequence = (await session.execute(
      select(Deck.name)
      .join(Card, Card.deck_id == Deck.id)
      .where(Deck.user_id == user_id, Card.next_review_date <= datetime.utcnow())
      .group_by(Deck.id, Deck.name)
    )).scalars().all()
    sequences.append(sequence)
  else:
    if notification_conditions.deck.enabled:
      # All decks with a given number of cards that have been due for a given number of days.
      sequence = (await session.execute(
        select(Deck.name)
        .join(Card, Card.deck_id == Deck.id)
        .where(Deck.user_id == user_id, Card.next_review_date <= datetime.utcnow() - timedelta(days=notification_conditions.deck.days))
        .group_by(Deck.id, Deck.name)
        .having(func.count(Card.id) >= notification_conditions.deck.cards)
      )).scalars().all()
      sequences.append(sequence)
    if notification_conditions.card.enabled:
      # All decks with any card that has been due for a given number of days.
      sequence = (await session.execute(
        select(Deck.name)
        .join(Card, Card.deck_id == Deck.id)
        .where(Deck.user_id == user_id, Card.next_review_date <= datetime.utcnow() - timedelta(days=notification_conditions.card.days))
        .group_by(Deck.id, Deck.name)
      )).scalars().all()
      sequences.append(sequence)
  deck_names: set[str] = set()
  for deck_name in chain(*sequences):
    deck_names.add(deck_name)
  return deck_names, streak_condition, streak

def get_notification_message(deck_names: set[str], streak_condition: bool, streak: int) -> PushMessage:
  if len(deck_names) == 0:
    return PushMessage(
      title="No alerts!",
      body=None,
    )
  else:
    body = get_notification_body(deck_names, streak_condition)
    return PushMessage(
      title=get_notification_title(streak_condition, streak),
      body=body,
    )

def get_notification_body(deck_names: set[str], streak_condition: bool) -> str:
  """
  The body mentions a random deck to review and the number of other decks that also fit the
  notification criteria.
  """
  random_deck_name = random.choice(list(deck_names))
  others = len(deck_names) - 1

  # When we notify the user about a streak, we just include all decks that can be reviewed, even
  # if they do not fit the notification criteria. So we use the word "ready" instead of "due".
  adj = "ready" if streak_condition else "due"

  if others == 0:
    return f"'{random_deck_name}' is {adj}."
  else:
    return f"'{random_deck_name}' and {others} others are {adj}."

def get_notification_title(streak_condition: bool, streak: int) -> str:
  if streak_condition:
    return f"{streak}-day streak!"
  else:
    return "Review"

def check_notifications_secret(
  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
):
  """
  Check the HTTP bearer token against the notifications secret to ensure only trusted parties can
  trigger notifications.

  The notifications cron job must supply this secret.
  """
  if credentials is None or credentials.credentials != notifications_secret:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

def get_host(host: Annotated[str | None, Header()] = None):
  """The host header of the request."""
  if host is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host header not found")
  return host

def get_sub(host: str):
  """
  The 'sub' value of the vapid claims required by web push; where web push errors should be reported to.
  We simply use our site url.
  """
  if host.startswith("localhost:"):
    return "https://localhost"
  else:
    return f"https://{host}"

CheckNotificationsSecret = Annotated[None, Depends(check_notifications_secret)]
Host = Annotated[str, Depends(get_host)]

class PushMessage(APISchema):
  title: str
  body: str | None