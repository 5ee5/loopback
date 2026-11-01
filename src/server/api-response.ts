const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

export function jsonOk(body: unknown): Response {
  return Response.json(body, { headers: PUBLIC_HEADERS });
}

export function jsonError(status: 400 | 404, code: "invalid_id" | "not_found", message: string): Response {
  return Response.json(
    { error: { code, message } },
    // Errors are cheap; don't let a CDN pin them for long.
    { status, headers: { ...PUBLIC_HEADERS, "Cache-Control": "public, s-maxage=10" } },
  );
}
