import { useAuth, useClerk } from "@clerk/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { client } from "../api/client.gen";
import { attachBearerToRequest } from "../lib/apiAuth";
import { Spinner } from "./ui/Spinner";
import { Button } from "./ui/Button";

/**
 * Attach Clerk JWTs to Hey API calls and wait for handshake/`getToken`
 * before rendering signed-in UI.
 *
 * Do not replace `fetch` by manually rebuilding Request fields — that can
 * drop JSON/FormData bodies (FastAPI 422 on POST /api/decks). Use `auth` +
 * a request interceptor that clones the Request instead.
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
      auth: async () =>
        (await getTokenRef.current().catch(() => null)) ??
        tokenRef.current ??
        undefined,
    });
  }, [getToken]);

  useEffect(() => {
    const interceptorId = client.interceptors.request.use(async (request) =>
      attachBearerToRequest(
        request,
        async () =>
          (await getTokenRef.current().catch(() => null)) ?? tokenRef.current,
      ),
    );

    return () => {
      client.interceptors.request.eject(interceptorId);
    };
  }, []);

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
