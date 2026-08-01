from __future__ import annotations
from typing import Annotated

from fastapi import APIRouter, HTTPException, Header, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from models import NotificationConditions, NotificationConditionsDefaults, PushSubscription, Settings, SettingsGet, SettingsGetResponse, SettingsUpdate, SettingsUpdateResponse
from auth import CurrentUserId
from db import SessionDep


router = APIRouter(tags=["settings"])

@router.post("/api/settings", response_model=SettingsGetResponse)
async def get_settings(
  body: SettingsGet,
  session: SessionDep,
  user_id: CurrentUserId,
):
  push_subscription = body.push_subscription
  is_subscribed = False if push_subscription is None else (
    (await session.execute(
      select(PushSubscription)
      .where(
        PushSubscription.endpoint == push_subscription.endpoint,
        PushSubscription.keys_p256dh == push_subscription.keys.p256dh,
        PushSubscription.keys_auth == push_subscription.keys.auth,
      )
    )).scalar_one_or_none() is not None
  )
  settings = (await session.execute(
    select(Settings)
    .where(Settings.user_id == user_id)
  )).scalar_one_or_none()
  if settings is None:
    return SettingsGetResponse(
      is_subscribed=is_subscribed,
      notification_time=None,
      notification_conditions=NotificationConditionsDefaults(),
    )
  else:
    return SettingsGetResponse(
      is_subscribed=is_subscribed,
      notification_time=settings.notification_time,
      notification_conditions=NotificationConditions.from_settings(settings),
    )

@router.patch("/api/settings", response_model=SettingsUpdateResponse)
async def update_settings(
  settings: SettingsUpdate,
  session: SessionDep,
  user_id: CurrentUserId,
  host: Annotated[str | None, Header()] = None,
):
  if host is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host header not found")
  insert_ = insert(Settings).values(
    user_id=user_id,
    notification_time=settings.notification_time,
    deck_notification_condition_enabled=settings.notification_conditions.deck.enabled,
    deck_notification_condition_cards=settings.notification_conditions.deck.cards,
    deck_notification_condition_days=settings.notification_conditions.deck.days,
    card_notification_condition_enabled=settings.notification_conditions.card.enabled,
    card_notification_condition_days=settings.notification_conditions.card.days,
    streak_notification_condition_enabled=settings.notification_conditions.streak.enabled,
    streak_notification_condition_days=settings.notification_conditions.streak.days,
  )
  settings_id = (await session.execute(
    insert_
    .on_conflict_do_update(
      index_elements=["user_id"],
      set_={
        "notification_time": settings.notification_time,
        "deck_notification_condition_enabled": settings.notification_conditions.deck.enabled,
        "deck_notification_condition_cards": settings.notification_conditions.deck.cards,
        "deck_notification_condition_days": settings.notification_conditions.deck.days,
        "card_notification_condition_enabled": settings.notification_conditions.card.enabled,
        "card_notification_condition_days": settings.notification_conditions.card.days,
        "streak_notification_condition_enabled": settings.notification_conditions.streak.enabled,
        "streak_notification_condition_days": settings.notification_conditions.streak.days,
      },  
    )
    .returning(Settings.id)
  )).scalar()
  assert settings_id is not None
  if settings.notifications_enabled:
    if settings.push_subscription is None:
      raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Push subscription required if notifications enabled")
    subscription = settings.push_subscription

    # Insert if doesn't exist.
    await session.execute(
      insert(PushSubscription)
      .values(
        settings_id=settings_id,
        host=host,
        endpoint=subscription.endpoint,
        keys_p256dh=subscription.keys.p256dh,
        keys_auth=subscription.keys.auth,
      )
      .on_conflict_do_nothing()
    )
    await session.commit()
    return SettingsUpdateResponse(push_subscription_result="enabled")
  else:
    if settings.push_subscription is None:
      return SettingsUpdateResponse(push_subscription_result="nothing to delete")
    subscription = settings.push_subscription
    db_subscription = (await session.execute(
      select(PushSubscription)
      .where(
        PushSubscription.settings_id == settings_id,
        PushSubscription.host == host,
        PushSubscription.endpoint == subscription.endpoint,
        PushSubscription.keys_p256dh == subscription.keys.p256dh,
        PushSubscription.keys_auth == subscription.keys.auth,
      )
    )).scalar_one_or_none()
    if not db_subscription:
      raise HTTPException(status_code=404, detail="Push subscription not found")
    await session.execute(delete(PushSubscription).where(PushSubscription.id == db_subscription.id))
    await session.commit()
    return SettingsUpdateResponse(push_subscription_result="deleted")