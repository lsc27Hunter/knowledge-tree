import { UserButton, useUser } from "@clerk/react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDiscoverableDecks, type DeckListResponse } from "../api";
import { toast } from "sonner";

import { Navbar } from "../components/ui/Navbar";
import {
  DeckCard,
  type Deck as DashboardDeck,
} from "../components/ui/DeckCard";
import { Spinner } from "../components/ui/Spinner";
import { PageShell } from "../components/ui/PageShell";

function toDashboardDeck(deck: DeckListResponse): DashboardDeck {
  return {
    id: deck.id,
    creatorUserId: deck.creatorUserId,
    creatorUsername: deck.creatorUsername,
    creatorDisplayName: deck.creatorDisplayName,
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
  const { isLoaded, user } = useUser();
  const [decks, setDecks] = useState<DashboardDeck[]>([]);
  const [decksError, setDecksError] = useState<string | null>(null);

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
      toast.error("Couldn't load discovery", { description: message });
    }
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadDecks();
  }, [isLoaded, loadDecks]);

  const { mine, others } = useMemo(() => {
    const currentUserId = user?.id;
    const mine: DashboardDeck[] = [];
    const others: DashboardDeck[] = [];
    for (const deck of decks) {
      if (currentUserId && deck.creatorUserId === currentUserId) {
        mine.push(deck);
      } else {
        others.push(deck);
      }
    }
    return { mine, others };
  }, [decks, user?.id]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <Navbar
        version="Discovery"
        userButton={<UserButton />}
        onDeckCreated={() => {
          void loadDecks();
        }}
      />

      <PageShell width="wide">
        <h1 className="type-heading text-fg">Discover</h1>
        <p className="type-body mt-2 max-w-2xl text-primary-light-grey">
          Browse public decks from other learners. Preview cards, then add a
          copy to your dashboard. Mark a deck public from Create/Edit to share
          yours.
        </p>

        {decksError ? (
          <p className="type-caption mt-4 text-danger-red">{decksError}</p>
        ) : null}

        {mine.length > 0 ? (
          <section className="mt-10">
            <h2 className="type-title text-fg">Your Public Decks</h2>
            <p className="type-caption mt-1 text-primary-light-grey">
              These are live in Discover for everyone else. You manage them from
              Decks.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {mine.map((deck) => (
                <DeckCard key={deck.id} deckData={deck} isDiscoveryPage />
              ))}
            </div>
          </section>
        ) : null}

        <section className={mine.length > 0 ? "mt-12" : "mt-10"}>
          <h2 className="type-title text-fg">From Other Learners</h2>
          {others.length === 0 && !decksError ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-primary-grey/50 px-6 py-12 text-center">
              <p className="type-body text-primary-light-grey">
                No shared decks from other users yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {others.map((deck) => (
                <DeckCard key={deck.id} deckData={deck} isDiscoveryPage />
              ))}
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
}
