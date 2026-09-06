import { getSimpleIconSvg } from "@/lib/icon-index";

/**
 * GET /api/icons/simple/[slug]
 * Serves brand-colored Simple Icons SVGs from the bundled `simple-icons` package.
 * Immutable caching — the data only changes when the app is redeployed.
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
