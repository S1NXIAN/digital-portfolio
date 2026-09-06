import { searchIcons } from "@/lib/icon-index";

export const dynamic = "force-dynamic";

/**
 * GET /api/icons/search?q=nodejs&limit=30
 * Public, read-only, server-cached index search across Dashboard Icons + Simple Icons.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? 30);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 60)
    : 30;

  try {
    const result = await searchIcons(q, limit);
    return Response.json(result, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    console.error("icon search failed", err);
    return Response.json({ error: "Icon search failed" }, { status: 500 });
  }
}
