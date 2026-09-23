"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SwipeDeck } from "@/components/SwipeDeck";
import { useSessionStatus } from "@/lib/useSessionStatus";
import { getSessionIdentity } from "@/lib/device";
import type { PooledTitle, SwipeDirection } from "@/lib/types";

export default function SwipePage({ params }: PageProps<"/session/[code]/swipe">) {
  const { code } = use(params);
  const router = useRouter();
  const { session, loading } = useSessionStatus(code);
  const [identity] = useState(() => getSessionIdentity(code));

  const [loadedRound, setLoadedRound] = useState<number | null>(null);
  const [pool, setPool] = useState<PooledTitle[] | null>(null);
  const [phase, setPhase] = useState<"loading" | "swiping" | "waiting">("loading");

  useEffect(() => {
    if (!identity) {
      router.replace(`/join/${code}`);
    }
  }, [code, router, identity]);

  useEffect(() => {
    if (!session) return;

    if (session.status === "match_found") {
      router.replace(`/session/${code}/match`);
      return;
    }
    if (session.status === "final_choice" || session.status === "completed") {
      router.replace(`/session/${code}/final-choice`);
      return;
    }
    if (session.status !== "swiping") return;

    if (loadedRound !== session.round) {
      let cancelled = false;
      (async () => {
        const res = await fetch(`/api/session/${code}/pool?round=${session.round}`, {
          cache: "no-store",
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        setPool(data.pool);
        setLoadedRound(session.round);
        setPhase("swiping");
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [session, loadedRound, code, router]);

  const handleSwipe = useCallback(
    (title: PooledTitle, direction: SwipeDirection) => {
      if (!identity || loadedRound === null) return;
      fetch(`/api/session/${code}/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: identity.participantId,
          round: loadedRound,
          tmdbId: title.tmdb_id,
          mediaType: title.media_type,
          direction,
        }),
      }).catch(() => {});
    },
    [code, loadedRound, identity]
  );

  const handleDeckEmpty = useCallback(() => {
    if (!identity || loadedRound === null) return;
    setPhase("waiting");
    fetch(`/api/session/${code}/finish-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: identity.participantId, round: loadedRound }),
    }).catch(() => {});
  }, [code, loadedRound, identity]);

  if (loading || phase === "loading" || !pool) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading tonight&apos;s picks…</p>
      </main>
    );
  }

  if (phase === "waiting") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-to)] border-t-transparent" />
        <p className="text-lg font-semibold">Waiting for your partner…</p>
        <p className="text-sm text-[var(--text-faint)]">
          Round {loadedRound} done — {pool.length} titles swiped.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Swipe tonight&apos;s picks</h1>
        <span className="text-xs text-[var(--text-faint)]">Round {loadedRound} of 2</span>
      </div>
      <SwipeDeck
        titles={pool}
        seed={`${identity?.participantId}:${loadedRound}`}
        onSwipe={handleSwipe}
        onDeckEmpty={handleDeckEmpty}
      />
    </main>
  );
}
