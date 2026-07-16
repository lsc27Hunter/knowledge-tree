# Deck mastery from SM-2 intervals.
# Longer intervals mean the card is retained longer → higher mastery.
# An interval of ~21 days ≈ 100% on the log scale below.

import math
from typing import Protocol, Sequence


class HasInterval(Protocol):
  interval: int


# Interval days that map to "fully mastered" on the log scale.
MASTERED_INTERVAL_DAYS = 21


def card_mastery(interval: int) -> float:
  """Individual card mastery in [0.0, 1.0] from its SM-2 interval."""
  if interval <= 0:
    return 0.0
  return min(1.0, math.log(interval + 1, MASTERED_INTERVAL_DAYS))


def calculate_deck_mastery(cards: Sequence[HasInterval]) -> float:
  """Average mastery across cards as a percentage in [0.0, 100.0]."""
  if not cards:
    return 0.0

  total = sum(card_mastery(card.interval) for card in cards)
  return round((total / len(cards)) * 100.0, 2)
