"use client";

import { posterUrl } from "@/lib/tmdb";
import type { OttLink } from "@/lib/types";

interface MatchTitle {
  title: string;
  year: number | null;
  imdb_rating: number | null;
  runtime: number | null;
  overview: string | null;
  poster_path: string | null;
  media_type: "movie" | "tv";
}

interface MatchRevealProps {
  title: MatchTitle;
  ottLinks: OttLink[];
}

export function MatchReveal({ title, ottLinks }: MatchRevealProps) {
  const poster = posterUrl(title.poster_path);

  return (
    <div className="match-reveal flex flex-col items-center gap-6 text-center">
      <span className="gradient-accent rounded-full px-5 py-2 text-sm font-bold tracking-wide text-white">
        ✨ IT&apos;S A MATCH
      </span>

      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={title.title}
          className="h-72 w-48 rounded-[var(--radius-lg)] object-cover shadow-2xl"
        />
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">{title.title}</h2>
        <div className="flex items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
          {title.year && <span>{title.year}</span>}
          {title.imdb_rating != null && <span>★ {title.imdb_rating.toFixed(1)}</span>}
          {title.runtime && <span>{title.runtime} min</span>}
        </div>
      </div>

      {title.overview && (
        <p className="max-w-xs text-sm text-[var(--text-faint)]">{title.overview}</p>
      )}

      <div className="flex w-full flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Watch it now on
        </h3>
        {ottLinks.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">No India streaming info found right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ottLinks.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-between"
              >
                <span>{link.displayName}</span>
                <span aria-hidden>→</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
