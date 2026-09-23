"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { posterUrl } from "@/lib/tmdb";
import type { PooledTitle, SwipeDirection } from "@/lib/types";

interface SwipeCardProps {
  title: PooledTitle;
  onSwipe: (direction: SwipeDirection) => void;
  active: boolean;
  stackOffset: number;
}

const SWIPE_THRESHOLD = 100;

export function SwipeCard({ title, onSwipe, active, stackOffset }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) onSwipe("right");
    else if (info.offset.x < -SWIPE_THRESHOLD) onSwipe("left");
  }

  const poster = posterUrl(title.poster_path);

  return (
    <motion.div
      className="absolute inset-0 card-surface overflow-hidden select-none"
      style={{ x, rotate, zIndex: 10 - stackOffset }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={active ? handleDragEnd : undefined}
      initial={false}
      animate={{ scale: 1 - stackOffset * 0.04, y: stackOffset * 14 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
    >
      <div className="relative h-[60%] w-full bg-[var(--surface-raised)]">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={title.title} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-faint)]">
            No poster available
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--surface)] to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
          {title.media_type === "movie" ? "Movie" : "Series"}
        </span>
      </div>

      <div className="flex h-[40%] flex-col gap-2 px-5 py-4">
        <h3 className="text-xl font-bold leading-tight">{title.title}</h3>
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          {title.year && <span>{title.year}</span>}
          {title.imdb_rating != null && <span>★ {title.imdb_rating.toFixed(1)}</span>}
          {title.runtime && <span>{title.runtime} min</span>}
        </div>
        {title.overview && <p className="line-clamp-2 text-sm text-[var(--text-faint)]">{title.overview}</p>}
      </div>

      {active && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-lg border-4 border-[var(--success)] px-3 py-1 text-lg font-extrabold text-[var(--success)]"
          >
            LIKE
          </motion.div>
          <motion.div
            style={{ opacity: passOpacity }}
            className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-lg border-4 border-[var(--danger)] px-3 py-1 text-lg font-extrabold text-[var(--danger)]"
          >
            PASS
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
