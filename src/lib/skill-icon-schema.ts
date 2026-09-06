import { z } from "zod";

/**
 * Skill icon value stored on a Skill row:
 * - ""                                    → auto-match from the skill name (simple-icons → dashboard-icons)
 * - "https://…" / "http://…" / "data:image/…" → custom icon URL, used verbatim
 * - anything else                         → icon slug (kebab-case); simple-icons is tried first,
 *                                           then dashboard-icons — the other provider covers misses
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
    "Use an https:// image URL or an icon slug (simple-icons / dashboard-icons, kebab-case)"
  );
