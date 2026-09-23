import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { buildPoolRound2, type TitleSummary } from "@/lib/poolBuilder";
import { getTitleDetails } from "@/lib/rapidapi";
import type { OttLink, TitlesPoolRow } from "@/lib/types";

function key(t: { media_type: string; tmdb_id: number }): string {
  return `${t.media_type}:${t.tmdb_id}`;
}

function toSummary(t: TitlesPoolRow): TitleSummary {
  return { title: t.title, overview: t.overview ?? "", genre_ids: t.genres };
}

export async function POST(request: Request, ctx: RouteContext<"/api/session/[code]/finish-round">) {
  const { code } = await ctx.params;
  const body = await request.json().catch(() => null);
  const participantId = body?.participantId as string | undefined;
  const round = body?.round as number | undefined;

  if (!participantId || !round) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const participant = await store.getParticipantById(participantId);
  if (!participant || participant.session_id !== session.id) {
    return NextResponse.json({ error: "invalid participant" }, { status: 403 });
  }

  await store.setParticipantFinishedRound(participantId, round);

  const participants = await store.getParticipants(session.id);
  const pA = participants.find((p) => p.role === "A");
  const pB = participants.find((p) => p.role === "B");
  if (!pA || !pB) return NextResponse.json({ error: "session incomplete" }, { status: 409 });

  if (pA.finished_round < round || pB.finished_round < round) {
    return NextResponse.json({ result: "waiting" });
  }

  // Atomically claim the "compute the outcome" job so a race between both
  // partners' finish-round calls doesn't compute it twice.
  const claimed = await store.claimTransition(session.id, "swiping", { status: "generating_brief" });
  if (!claimed) {
    const latest = await store.getSessionById(session.id);
    return NextResponse.json({ result: "already_resolved", status: latest?.status });
  }

  try {
    const swipesRound = await store.getSwipes(session.id, round);
    const rightA = new Set(
      swipesRound.filter((s) => s.participant_id === pA.id && s.direction === "right").map(key)
    );
    const rightB = new Set(
      swipesRound.filter((s) => s.participant_id === pB.id && s.direction === "right").map(key)
    );
    const overlapKeys = Array.from(rightA).filter((k) => rightB.has(k));

    if (overlapKeys.length > 0) {
      const roundPool = await store.getTitlesPool(session.id, round);
      const overlapTitles = roundPool.filter((t) => overlapKeys.includes(key(t)));
      const best = overlapTitles.sort((a, b) => (b.imdb_rating ?? 0) - (a.imdb_rating ?? 0))[0];

      let ottLinks: OttLink[] = [];
      if (best.imdb_id) {
        const details = await getTitleDetails(best.imdb_id);
        ottLinks = details?.ottLinks ?? [];
      }

      await store.updateSession(session.id, {
        status: "match_found",
        match_tmdb_id: best.tmdb_id,
        match_media_type: best.media_type,
        match_ott: ottLinks,
      });
      return NextResponse.json({ result: "match" });
    }

    if (round === 1) {
      const round1Pool = await store.getTitlesPool(session.id, 1);
      const likedA = round1Pool.filter((t) => rightA.has(key(t))).map(toSummary);
      const likedB = round1Pool.filter((t) => rightB.has(key(t))).map(toSummary);
      const excludeKeys = new Set(round1Pool.map(key));

      if (!session.brief || !pA.preferences || !pB.preferences) {
        throw new Error("session missing brief/preferences for round 2 build");
      }

      const { brief, pool } = await buildPoolRound2(
        session.brief,
        pA.preferences,
        pB.preferences,
        likedA,
        likedB,
        excludeKeys
      );
      await store.insertTitlesPool(session.id, 2, pool);
      await store.updateSession(session.id, { status: "swiping", round: 2, brief });
      return NextResponse.json({ result: "round2" });
    }

    await store.updateSession(session.id, { status: "final_choice" });
    return NextResponse.json({ result: "final_choice" });
  } catch (err) {
    console.error("finish-round outcome computation failed:", err);
    await store.updateSession(session.id, { status: "swiping" });
    return NextResponse.json({ error: "failed to compute round outcome" }, { status: 500 });
  }
}
