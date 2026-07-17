# SM-2 spaced repetition scheduling (Wozniak, 1987).
# Frontend ratings map to SM-2 quality: red=1, yellow=3, green=5.

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal


RATING_TO_QUALITY = {
  "red": 1,
  "yellow": 3,
  "green": 5,
}

MIN_EASINESS = 1.3


@dataclass(frozen=True)
class SM2Result:
  repetitions: int
  easiness: float
  interval: int
  next_review_date: datetime


def rating_to_quality(rating: Literal["red", "yellow", "green"]) -> int:
  key = rating.strip().lower()
  if key not in RATING_TO_QUALITY:
    raise ValueError(f'Invalid rating "{rating}". Expected red, yellow, or green.')
  return RATING_TO_QUALITY[key]


def calculate_sm2(
  quality: int,
  repetitions: int,
  easiness: float,
  interval: int,
  now: datetime | None = None,
) -> SM2Result:
  """Apply one SM-2 review step and return updated scheduling state."""
  if quality < 0 or quality > 5:
    raise ValueError(f"quality must be between 0 and 5, got {quality}")

  if quality >= 3:
    if repetitions == 0:
      new_interval = 1
    elif repetitions == 1:
      new_interval = 6
    else:
      new_interval = max(1, round(interval * easiness))
    new_repetitions = repetitions + 1
  else:
    # Failed recall: reset streak, show again tomorrow.
    new_repetitions = 0
    new_interval = 1

  # Standard SM-2 easiness update.
  new_easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if new_easiness < MIN_EASINESS:
    new_easiness = MIN_EASINESS

  review_time = now or datetime.utcnow()
  next_review = review_time + timedelta(days=new_interval)

  return SM2Result(
    repetitions=new_repetitions,
    easiness=new_easiness,
    interval=new_interval,
    next_review_date=next_review,
  )
