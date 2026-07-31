export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(
    { status: "ok", service: "client", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
