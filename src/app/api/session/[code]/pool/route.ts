import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/session/[code]/pool">) {
  const { code } = await ctx.params;
  const roundParam = req.nextUrl.searchParams.get("round") ?? "1";

  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const pool =
    roundParam === "all"
      ? await store.getAllTitlesPool(session.id)
      : await store.getTitlesPool(session.id, Number(roundParam));
  return NextResponse.json({ pool });
}
