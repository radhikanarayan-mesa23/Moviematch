"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PreferenceForm } from "@/components/PreferenceForm";
import { useSessionStatus } from "@/lib/useSessionStatus";
import { getDeviceId, getSessionIdentity, setSessionIdentity } from "@/lib/device";
import type { Preferences } from "@/lib/types";

function routeForStatus(code: string, status: string): string | null {
  if (status === "swiping") return `/session/${code}/swipe`;
  if (status === "match_found") return `/session/${code}/match`;
  if (status === "final_choice" || status === "completed") return `/session/${code}/final-choice`;
  return null;
}

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = use(params);
  const router = useRouter();
  const { session, bSubmitted, loading } = useSessionStatus(code, 3000);
  const [identity] = useState(() => getSessionIdentity(code));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (identity?.role === "B" && session) {
      const dest = routeForStatus(code, session.status);
      if (dest) router.replace(dest);
    }
  }, [code, session, router, identity]);

  const alreadyUsed = !loading && bSubmitted && !identity;

  async function handleSubmit(preferences: Preferences) {
    setSubmitting(true);
    setError(null);
    try {
      const deviceId = getDeviceId();
      const res = await fetch(`/api/session/${code}/submit-prefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, preferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't build tonight's picks. Please try again.");
      setSessionIdentity(code, { role: "B", participantId: data.participantId });
      router.push(`/session/${code}/swipe`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-bold">Session not found</h1>
        <p className="text-sm text-[var(--text-muted)]">Double check the link your partner sent you.</p>
      </main>
    );
  }

  if (alreadyUsed) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-bold">This invite has already been used</h1>
        <p className="text-sm text-[var(--text-muted)]">Ask your partner to start a new session.</p>
      </main>
    );
  }

  if (submitting) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-to)] border-t-transparent" />
        <p className="text-lg font-semibold">Finding tonight&apos;s picks…</p>
        <p className="text-sm text-[var(--text-faint)]">This can take up to a minute.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Your turn — what are you in the mood for?</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Your partner already set theirs. Answer independently — you won&apos;t see their picks.
        </p>
      </div>
      <PreferenceForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Find tonight's picks"
        error={error}
      />
    </main>
  );
}
