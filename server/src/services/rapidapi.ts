import type { MediaType, OttPlatform } from "../types";

const HOST = "streaming-availability.p.rapidapi.com";

const ALLOWED_TYPES = new Set(["subscription", "rent", "buy", "free"]);

function normalizeType(raw: unknown): OttPlatform["type"] | null {
  if (typeof raw !== "string") return null;
  const t = raw.toLowerCase();
  if (ALLOWED_TYPES.has(t)) return t as OttPlatform["type"];
  if (t === "addon") return "subscription"; // closest fit among the four allowed values
  return null;
}

/**
 * Looks up Indian streaming availability for a title via RapidAPI's Streaming
 * Availability API. Defensive by design: the exact response shape isn't
 * guaranteed, so every field is pulled best-effort and any entry missing a
 * usable name/url/type is simply omitted rather than crashing the reveal.
 * Returns [] (never throws) if RAPIDAPI_KEY is unset, the request fails, or
 * nothing is found — a match should still reveal with no platforms listed
 * rather than 500.
 */
export async function getIndianOttPlatforms(tmdbId: number, mediaType: MediaType): Promise<OttPlatform[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  try {
    // v4 "Streaming Availability" API supports looking up a show by an
    // external id in the form "<mediaType>/<tmdb_id>".
    const url = `https://${HOST}/shows/${mediaType}/${tmdbId}?country=in`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": HOST,
      },
    });

    if (!res.ok) {
      console.error(`[rapidapi] streaming-availability request failed (${res.status}) for ${mediaType}/${tmdbId}`);
      return [];
    }

    const data: any = await res.json();
    const options: any[] = data?.streamingOptions?.in ?? [];
    if (!Array.isArray(options)) return [];

    const platforms: OttPlatform[] = [];
    for (const opt of options) {
      const name = opt?.service?.name ?? opt?.service?.id;
      const url = opt?.link ?? opt?.deepLink ?? opt?.videoLink;
      const type = normalizeType(opt?.type);
      if (!name || !url || !type) continue; // omit malformed entries, don't crash the reveal
      platforms.push({ name: String(name), url: String(url), type });
    }
    return platforms;
  } catch (err) {
    console.error(`[rapidapi] getIndianOttPlatforms failed for ${mediaType}/${tmdbId}:`, err);
    return [];
  }
}
