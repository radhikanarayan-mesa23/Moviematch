"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MatchReveal } from "@/components/MatchReveal";
import { StarRating } from "@/components/StarRating";
import { useSessionStatus } from "@/lib/useSessionStatus";
import { getSessionIdentity } from "@/lib/device";
import type { TitlesPoolRow } from "@/lib/types";

export default function MatchPage({ params }: PageProps<"/session/[code]/match">) {
  const { code } = use(params);
  const router = useRouter();
  const { session, loading } = useSessionStatus(code);
  const identity = useRef(getSessionIdentity(code));
  const [matchTitle, setMatchTitle] = useState<TitlesPoolRow | null>(null);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    if (!identity.current) router.replace(`/join/${code}`);
  }, [code, router]);

  useEffect(() => {
    if (!session || session.status !== "match_found" || !session.match_tmdb_id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/session/${code}/pool?round=all`, { cache: "no-store" });
      if (cancelled || !res.ok) return;
      const data = await res.json();
      const pool = data.pool as TitlesPoolRow[];
      const found = pool.find(
        (t) => t.tmdb_id === session.match_tmdb_id && t.media_type === session.match_media_type
      );
      setMatchTitle(found ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, code]);

  async function handleRate(stars: number) {
    if (!identity.current || !matchTitle) return;
    setRated(true);
    await fetch(`/api/session/${code}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: identity.current.participantId,
        tmdbId: matchTitle.tmdb_id,
        mediaType: matchTitle.media_type,
        title: matchTitle.title,
        stars,
      }),
    }).catch(() => {});
  }

  if (loading || !session || !matchTitle) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading your match…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10">
      <MatchReveal title={matchTitle} ottLinks={session.match_ott ?? []} />

      <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {rated ? "Thanks for rating!" : "Once you've watched it, rate it together"}
        </h3>
        <StarRating onRate={handleRate} disabled={rated} />
      </div>
    </main>
  );
}
