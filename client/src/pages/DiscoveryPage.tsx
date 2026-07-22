import { UserButton, useUser } from "@clerk/react";

import { useCallback, useEffect, useRef, useState } from "react";

import { getDiscoverableDecks, type DeckListResponse } from "../api";

import { Navbar } from "../components/ui/Navbar";
import {
  DeckCard,
  type Deck as DashboardDeck,
} from "../components/ui/DeckCard";
import { Spinner } from "../components/ui/Spinner";

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

export default function DiscoveryPage() {
  const { isLoaded } = useUser();
  const [sortingOption, setSortingOption] = useState("Next Review");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [decks, setDecks] = useState<DashboardDeck[]>([]);
  const [decksError, setDecksError] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const sortingOptions = ["Next Review", "Due Date", "Mastery", "Last Studied"];

  const loadDecks = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    try {
      setDecksError(null);
      const result = await getDiscoverableDecks();

      if (result.error) {
        throw result.error;
      }
      setDecks((result.data ?? []).map(toDashboardDeck));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load decks.";
      setDecksError(message);
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
  }, [isLoaded, loadDecks]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

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

  return (
    <div className="mb-4">
      <Navbar
        version="Dashboard"
        userButton={<UserButton />}
        onDeckCreated={() => {
          void loadDecks();
        }}
      />

      {decksError ? (
        <div className="mx-15 mt-3 text-small text-danger-red">
          {decksError}
        </div>
      ) : null}

      <div className="mx-4 mt-2 flex justify-center sm:mx-15 sm:justify-end">
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            className="rounded-lg bg-background px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            aria-haspopup="menu"
            aria-expanded={isSortMenuOpen}
            onClick={() => setIsSortMenuOpen((open) => !open)}
          >
            Sort by {sortingOption} v
          </button>

          {isSortMenuOpen ? (
            <div
              role="menu"
              className="absolute left-1/2 top-full z-40 mt-2 w-48 -translate-x-1/2 rounded-lg border border-primary-grey bg-background p-1 shadow-lg sm:left-auto sm:right-0 sm:translate-x-0"
            >
              {sortingOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-md px-3 py-2 text-left text-white hover:bg-primary-grey"
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
      <div className="mx-15 mt-15 grid grid-cols-1 gap-15 md:grid-cols-2 xl:grid-cols-3">
        {sortedDecks.map((deck) => (
          <DeckCard key={deck.id} deckData={deck} />
        ))}
      </div>
    </div>
  );
}
