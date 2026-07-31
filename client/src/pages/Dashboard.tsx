import { UserButton, useUser } from "@clerk/react";

import { useCallback, useEffect, useRef, useState } from "react";


import { getDecks, getStreak, type DeckListResponse } from "../api";

import { toast } from "sonner";


import { Navbar } from "../components/ui/Navbar";
import {
  DeckCard,
  type Deck as DashboardDeck,
} from "../components/ui/DeckCard";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { PageShell } from "../components/ui/PageShell";
import { focusRing, hoverSurface, interactive } from "../lib/interaction";

import Checkmark from "../assets/checkmark-circle.svg";
import StarBadge from "../assets/star-badge.svg";
import Danger from "../assets/danger.svg";

function toDashboardDeck(deck: DeckListResponse): DashboardDeck {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    mastery: deck.mastery / 100,
    dueDate: deck.dueDate,
    nextReviewDate: deck.nextReviewDate,
    totalCards: deck.totalCards,
    lastStudiedAt: deck.lastStudiedAt ?? new Date(0).toISOString(),
    activeStudySession: deck.activeStudySession,
    discoverable: deck.discoverable,
  };
}

function isDeckReady(deck: DashboardDeck): boolean {
  if (!deck.nextReviewDate) return true;
  const next = new Date(deck.nextReviewDate + "Z").getTime();
  if (Number.isNaN(next)) return true;
  return next <= Date.now();
}

export default function DashboardPage() {
  const { isLoaded, user } = useUser();
  const [sortingOption, setSortingOption] = useState("Next Review");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [decks, setDecks] = useState<DashboardDeck[]>([]);
  const [decksError, setDecksError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakError, setStreakError] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortingOptions = ["Next Review", "Due Date", "Mastery", "Last Studied"];

  const loadDecks = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    try {
      setDecksError(null);
      const result = await getDecks();

      if (result.error) {
        throw result.error;
      }
      setDecks((result.data ?? []).map(toDashboardDeck));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load decks.";
      setDecksError(message);
      toast.error("Couldn't load decks", { description: message });
    }
  }, [isLoaded]);

  const loadStreak = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    try {
      setStreakError(null);
      const result = await getStreak();

      if (result.error) {
        throw result.error;
      }
      setCurrentStreak(result.data?.currentStreak ?? 0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load streak.";
      setStreakError(message);
    }
  }, [isLoaded]);

  useEffect(() => {
    const closeMenuOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    document.addEventListener("touchstart", closeMenuOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
      document.removeEventListener("touchstart", closeMenuOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadDecks();
    void loadStreak();
  }, [isLoaded, loadDecks, loadStreak]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }


  const userData = {
    userId: user?.id,
    userName: user?.username ?? user?.fullName ?? user?.firstName ?? "Learner",
    userEmail: user?.primaryEmailAddress?.emailAddress ?? "",
    userFirstName:
      user?.username?.split(" ")[0] ?? user?.firstName ?? "Learner",
    currentStreak,
  };

  const displayName =
    user?.username?.split(" ")[0] ?? user?.firstName ?? "Learner";


  const sortedDecks = [...decks].sort((a, b) => {
    if (sortingOption === "Next Review") {
      if (!a.nextReviewDate) return 1;
      if (!b.nextReviewDate) return -1;
      return (
        new Date(a.nextReviewDate).getTime() -
        new Date(b.nextReviewDate).getTime()
      );
    } else if (sortingOption === "Due Date") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortingOption === "Mastery") {
      return b.mastery - a.mastery;
    } else if (sortingOption === "Last Studied") {
      return (
        new Date(b.lastStudiedAt).getTime() -
        new Date(a.lastStudiedAt).getTime()
      );
    }
    return 0;
  });

  const deckCount = sortedDecks.length;
  const cardCount = sortedDecks.reduce((acc, deck) => acc + deck.totalCards, 0);
  const averageMastery =
    deckCount === 0
      ? 0
      : sortedDecks.reduce((acc, deck) => acc + deck.mastery, 0) / deckCount;
  const readyNowCount = sortedDecks.filter(isDeckReady).length;

  const decksDueThisWeek = sortedDecks.filter((deck) => {
    if (!deck.dueDate) return false;

    const dueDateOnly = deck.dueDate.slice(0, 10);
    const dueDate = new Date(`${dueDateOnly}T00:00:00`);

    if (Number.isNaN(dueDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(today.getDate() + 7);

    return dueDate >= today && dueDate <= oneWeekFromToday;
  });

  return (
    <div>
      <Navbar
        version="Dashboard"
        userButton={<UserButton />}
        onDeckCreated={() => {
          void loadDecks();
        }}
      />

      <PageShell width="wide">
        <h1 className="type-heading min-w-0 break-words text-fg [overflow-wrap:anywhere]">
          {displayName}&apos;s Decks
        </h1>
        <p className="type-body mt-2 text-primary-light-grey">
          {deckCount} {deckCount === 1 ? "deck" : "decks"}{" "}
          <span aria-hidden="true">&bull;</span> {cardCount}{" "}
          {cardCount === 1 ? "card" : "cards"}
        </p>
        {decksError ? (
          <p className="type-caption mt-3 text-danger-red">{decksError}</p>
        ) : null}

        <div className="type-mono mt-8 grid gap-4 rounded-2xl border border-border bg-primary-grey p-5 text-fg shadow-sm md:grid-cols-3 md:p-8">
          <Stat
            icon={Checkmark}
            value={`${Math.round(averageMastery * 100)}%`}
            label="Average Mastery"
          />
          <Stat
            icon={StarBadge}
            value={String(readyNowCount)}
            label={readyNowCount === 1 ? "Deck Ready Now" : "Decks Ready Now"}
          />
          <Stat
            icon={Danger}
            value={String(decksDueThisWeek.length)}
            label={
              decksDueThisWeek.length === 1
                ? "Deck Due This Week"
                : "Decks Due This Week"
            }
          />
        </div>

        <div className="mt-6 flex justify-stretch sm:justify-end">
          <div className="relative w-full sm:w-auto" ref={sortMenuRef}>
            <button
              type="button"
              className={`${interactive} ${focusRing} ${hoverSurface} inline-flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-2.5 type-body text-fg sm:w-auto sm:justify-center`}
              aria-haspopup="menu"
              aria-expanded={isSortMenuOpen}
              onClick={() => setIsSortMenuOpen((open) => !open)}
            >
              <span className="truncate">Sort · {sortingOption}</span>
              <span className="ml-2 shrink-0 text-primary-light-grey" aria-hidden="true">
                ▾
              </span>
            </button>

            {isSortMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-40 mt-2 w-full min-w-48 rounded-lg border border-border bg-background p-1 shadow-[var(--shadow-card)] sm:w-48"
              >
                {sortingOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="menuitem"
                    className={`${interactive} block w-full rounded-md px-3 py-2 text-left type-body text-fg hover:bg-primary-grey`}
                    onClick={() => {
                      setSortingOption(option);
                      setIsSortMenuOpen(false);
                    }}
                  >
                    Sort by {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {sortedDecks.length === 0 && !decksError ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-primary-grey/50 px-6 py-12 text-center">
            <h2 className="type-title text-fg">No Decks Yet</h2>
            <p className="type-body mx-auto mt-2 max-w-md text-primary-light-grey">
              Create a deck manually, upload a CSV, or grab one from Discovery to
              start studying.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                text="Browse Discovery"
                width="fit"
                color="primary-grey"
                textColor="fg"
                to="/discovery"
              />
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deckData={deck}
                onChanged={() => {
                  void loadDecks();
                }}
              />
            ))}
          </div>
        )}
      </PageShell>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-row items-center gap-3">
      <img src={icon} alt="" className="h-12 w-12 shrink-0 md:h-16 md:w-16" />
      <div className="flex min-w-0 flex-col">
        <div className="text-[1.75rem] leading-none md:text-[2rem]">{value}</div>
        <div className="type-caption mt-1 text-primary-light-grey">{label}</div>
      </div>
    </div>
  );
}
