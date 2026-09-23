import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { computeCoupleId } from "@/lib/coupleId";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });

  // This device's past participations -> their sessions -> the other
  // participant's device in each -> couple ids for every pairing this
  // device has ever been part of. No account system needed.
  const myParticipations = await store.findParticipantsByDevice(deviceId);
  const mySessionIds = myParticipations.map((p) => p.session_id);
  const mySessions = await store.getSessionsByIds(mySessionIds);

  const coupleIds = new Set<string>();
  for (const s of mySessions) {
    if (s.couple_id) coupleIds.add(s.couple_id);
  }
  for (const sessionId of mySessionIds) {
    const participants = await store.getParticipants(sessionId);
    const me = participants.find((p) => p.device_id === deviceId);
    const partner = participants.find((p) => p.device_id !== deviceId);
    if (me && partner) coupleIds.add(computeCoupleId(me.device_id, partner.device_id));
  }

  const coupleIdList = Array.from(coupleIds);
  const [coupleSessions, ratings] = await Promise.all([
    store.getSessionsByCoupleIds(coupleIdList),
    store.getRatingsForCoupleIds(coupleIdList),
  ]);

  const matchedSessions = coupleSessions.filter(
    (s) => (s.status === "match_found" || s.status === "completed") && s.match_tmdb_id
  );

  const matches = await Promise.all(
    matchedSessions.map(async (s) => {
      const pool = await store.getAllTitlesPool(s.id);
      const titleRow = pool.find(
        (t) => t.tmdb_id === s.match_tmdb_id && t.media_type === s.match_media_type
      );
      const rating = ratings.find((r) => r.session_id === s.id) ?? null;
      return {
        sessionCode: s.code,
        tmdbId: s.match_tmdb_id,
        mediaType: s.match_media_type,
        title: titleRow?.title ?? "Unknown title",
        posterPath: titleRow?.poster_path ?? null,
        year: titleRow?.year ?? null,
        imdbRating: titleRow?.imdb_rating ?? null,
        ott: s.match_ott ?? [],
        matchedAt: s.updated_at,
        rating,
      };
    })
  );

  matches.sort((a, b) => (a.matchedAt < b.matchedAt ? 1 : -1));

  return NextResponse.json({ matches, coupleCount: coupleIdList.length });
}
