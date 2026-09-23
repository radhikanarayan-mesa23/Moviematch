"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PreferenceForm } from "@/components/PreferenceForm";
import { getDeviceId, setSessionIdentity } from "@/lib/device";
import type { Preferences } from "@/lib/types";

export default function StartPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(preferences: Preferences) {
    setSubmitting(true);
    setError(null);
    try {
      const deviceId = getDeviceId();
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, preferences }),
      });
      if (!res.ok) throw new Error("Couldn't create a session. Please try again.");
      const data = await res.json();
      setSessionIdentity(data.code, { role: "A", participantId: data.participantId });
      router.push(`/session/${data.code}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">What are you in the mood for?</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Set your preferences, then invite your partner to do the same.
        </p>
      </div>
      <PreferenceForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Invite your partner"
        error={error}
      />
    </main>
  );
}
