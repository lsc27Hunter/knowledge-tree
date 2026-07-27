import { UserButton, useUser } from "@clerk/react";

import { useCallback, useEffect, useState } from "react";

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
      const currentUserId = user?.id;
      setDecks(
        (result.data ?? [])
          .map(toDashboardDeck)
          .filter((deck) => deck.creatorUserId !== currentUserId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load decks.";
      setDecksError(message);
    }
  }, [isLoaded, user?.id]);

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

      <div className="mx-4 mt-2 flex justify-center sm:mx-15 sm:justify-end"></div>
      <div className="font-semibold text-2xl text-white mx-15 mt-15">
        Discoverable Decks
      </div>
      <div className="mx-15 mt-2 text-small text-primary-light-grey">
        Browse decks created by other users. Preview Cards and add them to your
        own collection to study.
      </div>
      <div className="mx-15 mt-15 grid grid-cols-1 gap-15 md:grid-cols-2 xl:grid-cols-3">
        {decks.map((deck) => (
          <DeckCard key={deck.id} deckData={deck} isDiscoveryPage={true} />
        ))}
      </div>
    </div>
  );
}
