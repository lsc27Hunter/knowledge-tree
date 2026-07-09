import { useAuth } from "@clerk/react";
import { useEffect, useRef, type ReactNode } from "react";
import { client } from "../api/client.gen";

export function TokenProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    client.setConfig({
      auth: async () => {
        return await getTokenRef.current() ?? "";
      }
    });
  }, [getToken]);

  return <>{children}</>;
}