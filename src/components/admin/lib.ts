// Shared helpers for the admin panel components.

/**
 * Thin fetch wrapper for admin APIs.
 * - Always uses RELATIVE urls (same origin / gateway).
 * - Sends/receives JSON, throws a readable Error on non-2xx.
 */
export async function api<T>(
  url: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const method = options?.method ?? "GET";
  const res = await fetch(url, {
    method,
    headers:
      options?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // no body / invalid json — fall through
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    let hint = "";
    if (json && typeof json === "object") {
      const obj = json as { error?: unknown; hint?: unknown };
      if (typeof obj.error === "string" && obj.error) message = obj.error;
      if (typeof obj.hint === "string" && obj.hint) hint = obj.hint;
    }
    throw new Error(hint ? `${message} — ${hint}` : message);
  }

  return json as T;
}

/** Local date formatted as YYYY-MM-DD (no timezone drift from toISOString). */
export function todayKey(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
