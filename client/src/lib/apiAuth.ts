/**
 * Attach a Bearer token to a Request without destroying the body.
 *
 * Hey API builds `new Request(url, init)` then runs interceptors.
 * Rebuilding fetch via `{ method, headers, body: request.body }` can drop
 * JSON/FormData and surface as FastAPI 422s. Always clone the Request.
 */
export async function attachBearerToRequest(
  request: Request,
  getToken: () => Promise<string | null | undefined>,
): Promise<Request> {
  const token = await getToken();
  if (!token) return request;
  if (request.headers.get("Authorization")) return request;

  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}
