import { UserButton } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { listFriends, type FriendListItem } from "../api";
import { Navbar } from "../components/ui/Navbar";
import { PageShell } from "../components/ui/PageShell";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { focusRing, interactive } from "../lib/interaction";

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await listFriends();
      if (result.error) throw result.error;
      setFriends(result.data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load friends.";
      setError(message);
      toast.error("Couldn't load friends", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <Navbar version="Friends" userButton={<UserButton />} />

      <PageShell width="wide">
        <h1 className="type-heading text-fg">Friends</h1>
        <p className="type-body mt-2 max-w-2xl text-primary-light-grey">
          People you&apos;ve added from Discover. Open a profile to see their
          public decks and study activity.
        </p>

        {error ? (
          <p className="type-caption mt-4 text-danger-red">{error}</p>
        ) : null}

        {isLoading ? (
          <div className="mt-10 flex min-h-40 items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-border bg-primary-grey/90 px-4 py-3 shadow-sm">
              <Spinner className="h-5 w-5" />
              <span className="type-body text-fg">Loading friends...</span>
            </div>
          </div>
        ) : null}

        {!isLoading && friends.length === 0 && !error ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-primary-grey/50 px-6 py-12 text-center">
            <h2 className="type-title text-fg">No friends yet</h2>
            <p className="type-body mx-auto mt-2 max-w-md text-primary-light-grey">
              Find people on Discover and add them from their profile.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                text="Browse Discover"
                width="fit"
                color="accent"
                textColor="white"
                to="/discovery"
              />
            </div>
          </div>
        ) : null}

        {!isLoading && friends.length > 0 ? (
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {friends.map((friend) => (
              <li key={friend.userId}>
                <Link
                  to={`/users/${friend.userId}`}
                  className={`${interactive} ${focusRing} flex items-center gap-4 rounded-2xl border border-border bg-primary-grey p-4 shadow-sm transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-[var(--shadow-card)]`}
                >
                  <Avatar
                    name={friend.displayName}
                    imageUrl={friend.imageUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="type-title truncate text-fg">
                      {friend.displayName}
                    </div>
                    {friend.username ? (
                      <div className="type-caption truncate text-primary-light-grey">
                        @{friend.username}
                      </div>
                    ) : null}
                    <div className="type-caption mt-1 text-primary-light-grey">
                      {friend.discoverableDeckCount}{" "}
                      {friend.discoverableDeckCount === 1
                        ? "public deck"
                        : "public decks"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </PageShell>
    </div>
  );
}

function Avatar({
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
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-accent ring-1 ring-border"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

