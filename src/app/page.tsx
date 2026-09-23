import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
          for two
        </span>
        <h1 className="text-5xl font-black leading-none">
          <span className="gradient-accent-text">Tonight</span>
        </h1>
        <p className="mx-auto max-w-xs text-[var(--text-muted)]">
          Stop scrolling. Stop negotiating. Swipe together and find something you&apos;ll both
          actually like — with exactly where to watch it, right now.
        </p>
      </div>

      <Link href="/start" className="btn-primary w-full max-w-xs text-center">
        Start tonight&apos;s pick
      </Link>

      <Link href="/history" className="text-sm text-[var(--text-faint)] underline underline-offset-4">
        See past matches
      </Link>
    </main>
  );
}
