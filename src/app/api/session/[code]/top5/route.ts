import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { TitlesPoolRow } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/session/[code]/top5">) {
  const { code } = await ctx.params;
  const session = await store.getSessionByCode(code);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const allSwipes = await store.getSwipes(session.id);
  const pool = await store.getAllTitlesPool(session.id);
  const poolByKey = new Map(pool.map((t) => [`${t.media_type}:${t.tmdb_id}`, t]));

  const counts = new Map<string, number>();
  for (const s of allSwipes) {
    if (s.direction !== "right") continue;
    const k = `${s.media_type}:${s.tmdb_id}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const top5 = Array.from(counts.entries())
    .map(([k, count]) => ({ title: poolByKey.get(k), count }))
    .filter((x): x is { title: TitlesPoolRow; count: number } => Boolean(x.title))
    .sort((a, b) => b.count - a.count || (b.title.imdb_rating ?? 0) - (a.title.imdb_rating ?? 0))
    .slice(0, 5)
    .map((x) => ({ ...x.title, rightSwipeCount: x.count }));

  return NextResponse.json({ top5 });
}
