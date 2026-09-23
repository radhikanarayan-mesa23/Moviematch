"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDeviceId } from "@/lib/device";
import { posterUrl } from "@/lib/tmdb";
import type { MediaType, OttLink } from "@/lib/types";

interface HistoryMatch {
  sessionCode: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: number | null;
  imdbRating: number | null;
  ott: OttLink[];
  matchedAt: string;
  rating: { stars: number } | null;
}

export default function HistoryPage() {
  const [matches, setMatches] = useState<HistoryMatch[] | null>(null);

  useEffect(() => {
    const deviceId = getDeviceId();
    fetch(`/api/history?deviceId=${encodeURIComponent(deviceId)}`)
      .then((res) => res.json())
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => setMatches([]));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Past matches</h1>
        <p className="text-sm text-[var(--text-muted)]">Everything you two have picked together.</p>
      </div>

      {!matches ? (
        <p className="text-sm text-[var(--text-faint)]">Loading…</p>
      ) : matches.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-[var(--text-faint)]">No matches yet.</p>
          <Link href="/start" className="btn-primary">
            Pick something tonight
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((m) => (
            <div key={m.sessionCode} className="card-surface flex items-center gap-4 p-3">
              {posterUrl(m.posterPath, "w300") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={posterUrl(m.posterPath, "w300")!}
                  alt={m.title}
                  className="h-24 w-16 flex-shrink-0 rounded-[var(--radius-sm)] object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="font-semibold">{m.title}</h3>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {m.year && <span>{m.year}</span>}
                  {m.imdbRating != null && <span>★ {m.imdbRating.toFixed(1)}</span>}
                </div>
                {m.rating ? (
                  <span className="text-xs text-[var(--teal)]">
                    {"★".repeat(m.rating.stars)}
                    {"☆".repeat(5 - m.rating.stars)} rated
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-faint)]">Not rated yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
