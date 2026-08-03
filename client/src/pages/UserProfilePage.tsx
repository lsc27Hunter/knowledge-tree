import { UserButton } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  addFriend,
  getUserDiscoverableDecks,
  getUserProfile,
  removeFriend,
  type DeckListResponse,
  type PublicUserProfile,
} from "../api";
import { ActivityHeatmap } from "../components/ui/ActivityHeatmap";
import {
  DeckCard,
  type Deck as DashboardDeck,
} from "../components/ui/DeckCard";
import { Button } from "../components/ui/Button";
import { Navbar } from "../components/ui/Navbar";
import { PageShell } from "../components/ui/PageShell";
import { Spinner } from "../components/ui/Spinner";
import Checkmark from "../assets/checkmark-circle.svg";
import StarBadge from "../assets/star-badge.svg";

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

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [decks, setDecks] = useState<DashboardDeck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [friendBusy, setFriendBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      setIsLoading(true);
      setProfile(null);
      setDecks([]);
      const [profileResult, decksResult] = await Promise.all([
        getUserProfile({ path: { userId } }),
        getUserDiscoverableDecks({ path: { userId } }),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (decksResult.error) throw decksResult.error;

      const nextProfile = profileResult.data ?? null;
      if (nextProfile?.isSelf) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setProfile(nextProfile);
      setDecks((decksResult.data ?? []).map(toDashboardDeck));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load profile.";
      setError(message);
      toast.error("Couldn't load profile", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFriend() {
    if (!userId || !profile) return;
    setFriendBusy(true);
    const toastId = toast.loading(
      profile.isFriend ? "Removing friend..." : "Adding friend...",
    );
    try {
      const result = profile.isFriend
        ? await removeFriend({ path: { userId } })
        : await addFriend({ path: { userId } });
      if (result.error) throw result.error;
      setProfile({
        ...profile,
        isFriend: result.data?.isFriend ?? !profile.isFriend,
      });
      toast.success(
        result.data?.isFriend ? "Friend added" : "Friend removed",
        { id: toastId },
      );
    } catch (err) {
      toast.error("Couldn't update friendship", {
        id: toastId,
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setFriendBusy(false);
    }
  }

  return (
    <div>
      <Navbar version="Friends" userButton={<UserButton />} />

      <PageShell width="wide">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner />
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-2xl border border-dashed border-border bg-primary-grey/50 px-6 py-12 text-center">
            <h1 className="type-title text-fg">Profile unavailable</h1>
            <p className="type-body mt-2 text-danger-red">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                text="Back to Friends"
                width="fit"
                color="primary-grey"
                textColor="fg"
                to="/friends"
              />
            </div>
          </div>
        ) : null}

        {!isLoading && profile ? (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-primary-grey p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <ProfileAvatar
                  name={profile.displayName}
                  imageUrl={profile.imageUrl}
                />
                <div className="min-w-0">
                  <h1 className="type-heading min-w-0 truncate text-fg">
                    {profile.displayName}
                  </h1>
                  {profile.username ? (
                    <p className="type-body mt-1 text-primary-light-grey">
                      @{profile.username}
                    </p>
                  ) : null}
                  <p className="type-caption mt-1 text-primary-light-grey">
                    {profile.discoverableDeckCount}{" "}
                    {profile.discoverableDeckCount === 1
                      ? "public deck"
                      : "public decks"}
                  </p>
                </div>
              </div>

              <Button
                text={
                  friendBusy
                    ? "..."
                    : profile.isFriend
                      ? "Remove Friend"
                      : "Add Friend"
                }
                width="fit"
                color={profile.isFriend ? "primary-grey" : "accent"}
                textColor={profile.isFriend ? "fg" : "white"}
                disabled={friendBusy}
                onClick={() => {
                  void toggleFriend();
                }}
              />
            </div>

            <div className="type-mono mt-6 grid gap-4 rounded-2xl border border-border bg-primary-grey p-5 text-fg shadow-sm md:grid-cols-2 md:p-8">
              <Stat
                icon={Checkmark}
                value={`${profile.averageMastery}%`}
                label="Avg mastery"
              />
              <Stat
                icon={StarBadge}
                value={String(profile.currentStreak)}
                label={
                  profile.currentStreak === 1 ? "Day streak" : "Days streak"
                }
              />
            </div>

            <ActivityHeatmap className="mt-6" userId={profile.userId} />

            <section className="mt-10">
              <h2 className="type-title text-fg">Public Decks</h2>
              <p className="type-caption mt-1 text-primary-light-grey">
                Only their discoverable decks.
              </p>

              {decks.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-primary-grey/50 px-6 py-12 text-center">
                  <p className="type-body text-primary-light-grey">
                    {profile.displayName} has no discoverable decks yet.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {decks.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deckData={deck}
                      isDiscoveryPage
                      hideCreator
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </PageShell>
    </div>
  );
}

function ProfileAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border sm:h-20 sm:w-20"
      />
    );
  }
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/15 text-2xl font-semibold text-accent ring-1 ring-border sm:h-20 sm:w-20"
      aria-hidden="true"
    >
      {initial}
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
        <div className="text-[1.75rem] leading-none md:text-[2rem]">
          {value}
        </div>
        <div className="type-caption mt-1 text-primary-light-grey">{label}</div>
      </div>
    </div>
  );
}
