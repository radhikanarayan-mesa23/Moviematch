import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/session/[code]">) {
  const { code } = await ctx.params;
  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const participants = await store.getParticipants(session.id);
  const a = participants.find((p) => p.role === "A");
  const b = participants.find((p) => p.role === "B");

  return NextResponse.json({
    session,
    aSubmitted: Boolean(a?.submitted_at),
    bSubmitted: Boolean(b?.submitted_at),
  });
}
