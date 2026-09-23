import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { computeCoupleId } from "@/lib/coupleId";
import { buildPoolRound1 } from "@/lib/poolBuilder";
import type { Preferences } from "@/lib/types";

const DONE_STATUSES = new Set(["swiping", "match_found", "final_choice", "completed"]);

export async function POST(request: Request, ctx: RouteContext<"/api/session/[code]/submit-prefs">) {
  const { code } = await ctx.params;
  const body = await request.json().catch(() => null);
  const deviceId = body?.deviceId as string | undefined;
  const preferences = body?.preferences as Preferences | undefined;

  if (!deviceId || !preferences) {
    return NextResponse.json({ error: "deviceId and preferences are required" }, { status: 400 });
  }

  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  // Idempotent: pool already built (or being built) for this session.
  if (DONE_STATUSES.has(session.status) || session.status === "generating_brief") {
    const existingB = await store.getParticipant(session.id, "B");
    if (existingB) {
      return NextResponse.json({ code: session.code, participantId: existingB.id, role: "B" });
    }
  }

  const participantA = await store.getParticipant(session.id, "A");
  if (!participantA || !participantA.preferences) {
    return NextResponse.json({ error: "partner A hasn't submitted preferences yet" }, { status: 409 });
  }

  const participantB = await store.upsertParticipant(session.id, "B", deviceId, preferences);

  const claimed = await store.claimTransition(session.id, session.status, { status: "generating_brief" });
  if (!claimed) {
    // Another request is already building (or already built) the pool.
    return NextResponse.json({ code: session.code, participantId: participantB.id, role: "B" });
  }

  try {
    const coupleId = computeCoupleId(participantA.device_id, deviceId);
    await store.ensureCouple(coupleId);

    const { brief, pool } = await buildPoolRound1(participantA.preferences, preferences);

    if (pool.length === 0) {
      // Nothing survived both preference sets (e.g. a 9+ rating floor
      // combined with a narrow genre/era/language brief). Don't leave the
      // session in "swiping" with nothing to swipe — bounce it back so the
      // client shows a clear, actionable error instead of hanging forever.
      await store.updateSession(session.id, { status: session.status });
      return NextResponse.json(
        {
          error:
            "No titles matched both of your preferences tonight — try a lower minimum rating, a broader era, or an extra language, then try again.",
        },
        { status: 422 }
      );
    }

    await store.insertTitlesPool(session.id, 1, pool);
    await store.updateSession(session.id, {
      status: "swiping",
      round: 1,
      brief,
      couple_id: coupleId,
    });

    return NextResponse.json({ code: session.code, participantId: participantB.id, role: "B" });
  } catch (err) {
    console.error("pool build failed:", err);
    // Don't leave the session stuck — reset so the client can retry.
    await store.updateSession(session.id, { status: "waiting_b" });
    return NextResponse.json(
      { error: "Couldn't build tonight's picks — please try again." },
      { status: 500 }
    );
  }
}
