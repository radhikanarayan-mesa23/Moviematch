import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { MediaType } from "@/lib/types";

export async function POST(request: Request, ctx: RouteContext<"/api/session/[code]/rating">) {
  const { code } = await ctx.params;
  const body = await request.json().catch(() => null);
  const participantId = body?.participantId as string | undefined;
  const tmdbId = body?.tmdbId as number | undefined;
  const mediaType = body?.mediaType as MediaType | undefined;
  const title = body?.title as string | undefined;
  const stars = body?.stars as number | undefined;

  if (!participantId || !tmdbId || !mediaType || !title || !stars) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be 1-5" }, { status: 400 });
  }

  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const participant = await store.getParticipantById(participantId);
  if (!participant || participant.session_id !== session.id) {
    return NextResponse.json({ error: "invalid participant" }, { status: 403 });
  }

  await store.insertRating(session.id, session.couple_id, tmdbId, mediaType, title, stars);
  return NextResponse.json({ ok: true });
}
