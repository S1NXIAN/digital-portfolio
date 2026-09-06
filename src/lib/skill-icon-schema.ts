import { z } from "zod";

/**
 * Skill icon value stored on a Skill row:
 * - ""                                    → auto-match from the skill name (dashboard-icons, then simple-icons)
 * - "https://…" / "http://…" / "data:image/…" → custom icon URL, used verbatim
 * - anything else                         → dashboardicons.com slug (kebab-case), rendered via the jsDelivr CDN
 */
export const skillIconSchema = z
  .string()
  .trim()
  .max(1000, "Icon URL/slug is too long")
  .default("")
  .refine(
    (v) =>
      v === "" ||
      /^(https?:\/\/|data:image\/)/i.test(v) ||
      v.startsWith("/") ||
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(v),
    "Use an https:// image URL or a dashboardicons.com slug (kebab-case)"
  );
