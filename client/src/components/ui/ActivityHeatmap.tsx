import { useEffect, useMemo, useState } from "react";

import { getStudyActivity, type StudyActivityDay } from "../../api";

/**
 * Map daily review count → intensity 0–4 (GitHub-style).
 *
 * Absolute buckets, aligned with the streak rule (3+ cards/day qualifies):
 *   0      empty
 *   1–2    light
 *   3–5    medium (streak territory)
 *   6–14   heavy
 *   15+    very heavy
 */
export function reviewsToLevel(reviews: number): 0 | 1 | 2 | 3 | 4 {
  if (reviews <= 0) return 0;
  if (reviews <= 2) return 1;
  if (reviews <= 5) return 2;
  if (reviews <= 14) return 3;
  return 4;
}

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-border",
  1: "bg-success-green/25",
  2: "bg-success-green/45",
  3: "bg-success-green/70",
  4: "bg-success-green",
};

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

/** Full year — enough columns that fluid cells stay small while filling the card. */
const WEEKS = 53;
const GAP_PX = 3;
const GUTTER_PX = 28;
/** Floor so squares stay tappable on narrow screens (scrolls if needed). */
const MIN_CELL_PX = 8;

interface ActivityHeatmapProps {
  className?: string;
}

interface DayCell {
  date: Date;
  iso: string;
  reviews: number;
  level: 0 | 1 | 2 | 3 | 4;
  qualifies: boolean;
}

export function ActivityHeatmap({ className = "" }: ActivityHeatmapProps) {
  const [days, setDays] = useState<StudyActivityDay[]>([]);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getStudyActivity({ query: { weeks: WEEKS } });
        if (cancelled) return;
        if (result.error) throw result.error;
        setDays(result.data?.days ?? []);
        setFromDate(result.data?.fromDate ?? null);
        setToDate(result.data?.toDate ?? null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't load study activity.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grid = useMemo(
    () => buildGrid(WEEKS, days, fromDate, toDate),
    [days, fromDate, toDate],
  );

  const activeDays = days.filter((d) => d.reviewsCount > 0).length;
  const totalReviews = days.reduce((sum, d) => sum + d.reviewsCount, 0);

  const weekCount = grid.length || WEEKS;
  const gridTemplate = `${GUTTER_PX}px repeat(${weekCount}, minmax(${MIN_CELL_PX}px, 1fr))`;

  return (
    <section
      className={`rounded-2xl border border-border bg-primary-grey px-4 py-3 shadow-sm sm:px-5 sm:py-4 ${className}`}
      aria-label="Study activity heatmap"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="type-title text-fg">Study Activity</h2>
            <span className="type-caption text-primary-light-grey">
              Last 12 months
            </span>
          </div>
          <p
            className={`type-caption mt-0.5 ${error ? "text-danger-red" : "text-primary-light-grey"}`}
            role={error ? "alert" : undefined}
          >
            {isLoading
              ? "Loading…"
              : error
                ? "Couldn't load activity. Try refreshing."
                : totalReviews === 0
                  ? "Rate cards while studying to fill this in."
                  : `${totalReviews} review${totalReviews === 1 ? "" : "s"} · ${activeDays} day${activeDays === 1 ? "" : "s"}`}
          </p>
        </div>
        <Legend />
      </div>

      {/*
        Full-width fluid columns: more weeks ⇒ each square stays small.
        minmax(8px, 1fr) fills the card on desktop; scrolls horizontally on
        very narrow viewports instead of crushing cells.
      */}
      <div className="mt-3 w-full overflow-x-auto">
        <div
          className="flex min-w-full flex-col gap-1"
          style={{
            // Ensure the track is at least wide enough for min cells on mobile.
            minWidth: GUTTER_PX + weekCount * (MIN_CELL_PX + GAP_PX),
          }}
        >
          <div
            className="grid w-full items-end"
            style={{ gridTemplateColumns: gridTemplate, gap: GAP_PX }}
          >
            <div aria-hidden="true" />
            {grid.map((week, wi) => {
              const mid = week[3]?.date ?? week[0].date;
              const prev = grid[wi - 1];
              const show =
                wi === 0 ||
                mid.getUTCMonth() !==
                  (prev?.[3]?.date ?? prev?.[0]?.date)?.getUTCMonth();
              return (
                <div
                  key={`m-${week[0].iso}`}
                  className="type-caption overflow-visible whitespace-nowrap text-[0.65rem] leading-none text-primary-light-grey"
                >
                  {show
                    ? mid.toLocaleString(undefined, {
                        month: "short",
                        timeZone: "UTC",
                      })
                    : ""}
                </div>
              );
            })}
          </div>

          <div
            className={`grid w-full ${error ? "opacity-40" : ""}`}
            style={{ gridTemplateColumns: gridTemplate, gap: GAP_PX }}
          >
            {WEEKDAY_LABELS.map((label, row) => (
              <div
                key={`wd-${row}`}
                className="type-caption flex aspect-square items-center justify-end pr-1 text-[0.65rem] leading-none text-primary-light-grey"
                style={{ gridColumn: 1, gridRow: row + 1 }}
              >
                {label}
              </div>
            ))}

            {grid.map((week, wi) =>
              week.map((cell, di) => (
                <div
                  key={cell.iso}
                  title={error ? undefined : tooltipFor(cell)}
                  aria-label={error ? undefined : tooltipFor(cell)}
                  className={`aspect-square w-full rounded-[2px] ${LEVEL_CLASS[cell.level]}`}
                  style={{ gridColumn: wi + 2, gridRow: di + 1 }}
                />
              )),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex shrink-0 items-center gap-1 type-caption text-primary-light-grey">
      <span className="mr-0.5">Less</span>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span
          key={level}
          className={`inline-block h-2.5 w-2.5 rounded-[2px] ${LEVEL_CLASS[level]}`}
          aria-hidden="true"
        />
      ))}
      <span className="ml-0.5">More</span>
    </div>
  );
}

function tooltipFor(cell: DayCell): string {
  const label = cell.date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (cell.reviews === 0) return `No reviews on ${label}`;
  const streak = cell.qualifies ? " · streak day" : "";
  return `${cell.reviews} review${cell.reviews === 1 ? "" : "s"} on ${label}${streak}`;
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayKey(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return toIsoDate(value);
}

function buildGrid(
  weeks: number,
  days: StudyActivityDay[],
  fromDateIso: string | null,
  toDateIso: string | null,
): DayCell[][] {
  const byDate = new Map(days.map((d) => [dayKey(d.date as string | Date), d]));

  const end = toDateIso
    ? parseIsoDate(toDateIso.slice(0, 10))
    : (() => {
        const now = new Date();
        return new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
      })();

  // Prefer the API's Sunday-aligned start so FE/BE calendars match.
  const start = fromDateIso
    ? parseIsoDate(fromDateIso.slice(0, 10))
    : (() => {
        const daysSinceSunday = end.getUTCDay();
        const s = new Date(end);
        s.setUTCDate(end.getUTCDate() - daysSinceSunday - 7 * (weeks - 1));
        return s;
      })();

  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const weekCount = Math.max(1, Math.ceil(totalDays / 7));

  const columns: DayCell[][] = [];
  const cursor = new Date(start);

  for (let w = 0; w < weekCount; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toIsoDate(cursor);
      const row = byDate.get(iso);
      const reviews = row?.reviewsCount ?? 0;
      week.push({
        date: new Date(cursor.getTime()),
        iso,
        reviews,
        level: reviewsToLevel(reviews),
        qualifies: row?.qualifiesForStreak ?? false,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(week);
  }

  return columns;
}
