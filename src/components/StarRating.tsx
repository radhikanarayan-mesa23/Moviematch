"use client";

import { useState } from "react";

interface StarRatingProps {
  onRate: (stars: number) => void;
  disabled?: boolean;
}

export function StarRating({ onRate, disabled }: StarRatingProps) {
  const [rated, setRated] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? rated ?? 0;

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled || rated !== null}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => {
            setRated(n);
            onRate(n);
          }}
          className="text-3xl transition-transform active:scale-90 disabled:cursor-default"
          style={{ color: n <= display ? "var(--teal)" : "var(--border)" }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
