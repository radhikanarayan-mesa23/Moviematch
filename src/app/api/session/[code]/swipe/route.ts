import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { MediaType, SwipeDirection } from "@/lib/types";

export async function POST(request: Request, ctx: RouteContext<"/api/session/[code]/swipe">) {
  const { code } = await ctx.params;
  const body = await request.json().catch(() => null);
  const participantId = body?.participantId as string | undefined;
  const round = body?.round as number | undefined;
  const tmdbId = body?.tmdbId as number | undefined;
  const mediaType = body?.mediaType as MediaType | undefined;
  const direction = body?.direction as SwipeDirection | undefined;

  if (!participantId || !round || !tmdbId || !mediaType || !direction) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const participant = await store.getParticipantById(participantId);
  if (!participant || participant.session_id !== session.id) {
    return NextResponse.json({ error: "invalid participant" }, { status: 403 });
  }

  await store.insertSwipe(session.id, participantId, round, tmdbId, mediaType, direction);
  return NextResponse.json({ ok: true });
}
