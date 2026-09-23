"use client";

import { useEffect, useMemo, useState } from "react";
import { SwipeCard } from "./SwipeCard";
import { seededShuffle } from "@/lib/seededShuffle";
import type { PooledTitle, SwipeDirection } from "@/lib/types";

interface SwipeDeckProps {
  titles: PooledTitle[];
  seed: string;
  onSwipe: (title: PooledTitle, direction: SwipeDirection) => void;
  onDeckEmpty: () => void;
}

const VISIBLE_STACK = 3;

export function SwipeDeck({ titles, seed, onSwipe, onDeckEmpty }: SwipeDeckProps) {
  const ordered = useMemo(() => seededShuffle(titles, seed), [titles, seed]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // By the time this mounts, the parent page has already resolved a real
    // (possibly empty) titles array — never "not yet loaded" — so an empty
    // deck should finish the round immediately rather than hang silently.
    if (index >= ordered.length) {
      onDeckEmpty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ordered.length]);

  function handleSwipe(direction: SwipeDirection) {
    const current = ordered[index];
    if (!current) return;
    onSwipe(current, direction);
    setIndex((i) => i + 1);
  }

  const visible = ordered.slice(index, index + VISIBLE_STACK);
  const current = ordered[index];

  if (!current) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-[var(--text-muted)]">
        <p>Waiting for your partner…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="relative flex-1">
        {visible
          .map((title, i) => (
            <SwipeCard
              key={`${title.media_type}:${title.tmdb_id}`}
              title={title}
              active={i === 0}
              stackOffset={i}
              onSwipe={handleSwipe}
            />
          ))
          .reverse()}
      </div>

      <div className="flex items-center justify-center gap-6 pb-2">
        <button
          type="button"
          aria-label="Pass"
          onClick={() => handleSwipe("left")}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--danger)] text-2xl text-[var(--danger)] transition active:scale-95"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Like"
          onClick={() => handleSwipe("right")}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--success)] text-2xl transition active:scale-95"
        >
          ♥️
        </button>
      </div>
    </div>
  );
}
