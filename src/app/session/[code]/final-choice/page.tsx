"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/StarRating";
import { getSessionIdentity } from "@/lib/device";
import { posterUrl } from "@/lib/tmdb";
import type { TitlesPoolRow } from "@/lib/types";

type Top5Item = TitlesPoolRow & { rightSwipeCount: number };

export default function FinalChoicePage({ params }: PageProps<"/session/[code]/final-choice">) {
  const { code } = use(params);
  const router = useRouter();
  const identity = useRef(getSessionIdentity(code));
  const [top5, setTop5] = useState<Top5Item[] | null>(null);
  const [selected, setSelected] = useState<Top5Item | null>(null);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    if (!identity.current) router.replace(`/join/${code}`);
  }, [code, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/session/${code}/top5`, { cache: "no-store" });
      if (cancelled || !res.ok) return;
      const data = await res.json();
      setTop5(data.top5);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleRate(stars: number) {
    if (!identity.current || !selected) return;
    setRated(true);
    await fetch(`/api/session/${code}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: identity.current.participantId,
        tmdbId: selected.tmdb_id,
        mediaType: selected.media_type,
        title: selected.title,
        stars,
      }),
    }).catch(() => {});
  }

  if (!top5) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </main>
    );
  }

  if (selected) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {posterUrl(selected.poster_path) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl(selected.poster_path)!}
            alt={selected.title}
            className="h-64 w-44 rounded-[var(--radius-lg)] object-cover shadow-2xl"
          />
        )}
        <h2 className="text-xl font-bold">{selected.title}</h2>
        <p className="text-sm text-[var(--text-muted)]">Your pick for tonight. Enjoy!</p>
        <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {rated ? "Thanks for rating!" : "Once you've watched it, rate it together"}
          </h3>
          <StarRating onRate={handleRate} disabled={rated} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">No match tonight — you decide</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Here are the titles you both leaned toward. Pick one together.
        </p>
      </div>

      {top5.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-faint)]">No swipes recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {top5.map((t) => (
            <button
              key={`${t.media_type}:${t.tmdb_id}`}
              onClick={() => setSelected(t)}
              className="card-surface flex items-center gap-4 p-3 text-left transition active:scale-[0.99]"
            >
              {posterUrl(t.poster_path, "w300") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={posterUrl(t.poster_path, "w300")!}
                  alt={t.title}
                  className="h-24 w-16 flex-shrink-0 rounded-[var(--radius-sm)] object-cover"
                />
              )}
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{t.title}</h3>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {t.year && <span>{t.year}</span>}
                  {t.imdb_rating != null && <span>★ {t.imdb_rating.toFixed(1)}</span>}
                  <span className="text-[var(--teal)]">{t.rightSwipeCount}/2 liked</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
