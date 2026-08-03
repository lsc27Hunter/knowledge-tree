import { useAuth, useClerk } from "@clerk/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { client } from "../api/client.gen";
import { Spinner } from "./ui/Spinner";
import { Button } from "./ui/Button";

/**
 * Attach Clerk tokens to API requests.
 * Also waits out the __clerk_handshake redirect before rendering signed-in UI.
 */
export function TokenProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTokenRef = useRef(getToken);
  const tokenRef = useRef<string | null>(null);
  getTokenRef.current = getToken;

  const handshakePending = new URLSearchParams(location.search).has(
    "__clerk_handshake",
  );
  const signedIn = !!isSignedIn;

  useEffect(() => {
    client.setConfig({
      baseUrl: "",
      fetch: async (input, init) => {
        const token =
          (await getTokenRef.current().catch(() => null)) ?? tokenRef.current;

        if (input instanceof Request) {
          const headers = new Headers(input.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return globalThis.fetch(input.url, {
            method: input.method,
            headers,
            body:
              input.method === "GET" || input.method === "HEAD"
                ? undefined
                : input.body,
            credentials: "same-origin",
            signal: input.signal,
            redirect: input.redirect,
          });
        }

        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return globalThis.fetch(input, {
          ...init,
          headers,
          credentials: "same-origin",
        });
      },
    });
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setError(null);

      if (!isLoaded || handshakePending) {
        setReady(false);
        return;
      }

      if (!signedIn) {
        tokenRef.current = null;
        setReady(true);
        return;
      }

      setReady(false);

      for (let i = 0; i < 40 && !cancelled; i++) {
        const token = await getTokenRef.current().catch(() => null);
        if (token) {
          tokenRef.current = token;
          if (!cancelled) setReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
      }

      if (!cancelled) {
        setError(
          "Couldn't get a session token. In Firefox, allow clerk.accounts.dev under tracking protection, then sign out and back in.",
        );
        setReady(true);
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, signedIn, handshakePending, getToken]);

  if (!isLoaded || handshakePending || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error && signedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="type-body text-fg max-w-md">{error}</p>
        <Button
          text="Sign out"
          color="accent"
          onClick={() => void signOut({ redirectUrl: "/" })}
        />
      </div>
    );
  }

  return <>{children}</>;
}
