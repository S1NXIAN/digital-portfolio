import { getSimpleIconSvg } from "@/lib/icon-index";

/**
 * GET /api/icons/simple/v2/[slug]
 * Serves Simple Icons SVGs with the brand hex baked in as `fill`
 * (near-black brands are lifted to a light neutral so they stay visible on
 * the dark theme). Immutable caching — the data only changes on redeploy.
 *
 * v2 bumps the URL so browsers that cached un-colored v1 SVGs re-fetch.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const svg = getSimpleIconSvg(slug);
  if (!svg) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
