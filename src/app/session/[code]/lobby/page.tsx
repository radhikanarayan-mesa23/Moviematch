"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrShare } from "@/components/QrShare";
import { useSessionStatus } from "@/lib/useSessionStatus";
import { getSessionIdentity } from "@/lib/device";

export default function LobbyPage({ params }: PageProps<"/session/[code]/lobby">) {
  const { code } = use(params);
  const router = useRouter();
  const { session, bSubmitted, loading } = useSessionStatus(code);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  useEffect(() => {
    const identity = getSessionIdentity(code);
    if (!identity || identity.role !== "A") {
      router.replace(`/join/${code}`);
    }
  }, [code, router]);

  useEffect(() => {
    if (session?.status === "swiping") {
      router.replace(`/session/${code}/swipe`);
    }
  }, [session?.status, code, router]);

  if (loading || !origin) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </main>
    );
  }

  const joinUrl = `${origin}/join/${code}`;

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Invite your partner</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Have them scan this code, or send them the link.
        </p>
      </div>

      {bSubmitted ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-to)] border-t-transparent" />
          <p className="text-lg font-semibold">Partner&apos;s in! Building tonight&apos;s picks…</p>
          <p className="text-sm text-[var(--text-faint)]">This can take up to a minute.</p>
        </div>
      ) : (
        <QrShare url={joinUrl} />
      )}

      <p className="text-xs text-[var(--text-faint)]">Session code: {code}</p>
    </main>
  );
}
