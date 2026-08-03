import type { CreateClientConfig } from "./api/client.gen";

/**
 * Hey API client defaults. Auth is applied at runtime by TokenProvider.
 * baseUrl false in openapi-ts.config — empty string keeps /api on the Vite origin.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: "",
});
