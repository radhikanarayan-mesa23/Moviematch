"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionRow } from "@/lib/types";

interface SessionStatusState {
  session: SessionRow | null;
  aSubmitted: boolean;
  bSubmitted: boolean;
  loading: boolean;
}

// Subscribes to the session row via Supabase Realtime when available (no
// polling needed), falling back to polling when Supabase env vars are
// absent so the app still works in mock mode.
export function useSessionStatus(code: string, pollIntervalMs = 2500): SessionStatusState {
  const [state, setState] = useState<SessionStatusState>({
    session: null,
    aSubmitted: false,
    bSubmitted: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchOnce() {
      try {
        const res = await fetch(`/api/session/${code}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setState({
          session: data.session,
          aSubmitted: data.aSubmitted,
          bSubmitted: data.bSubmitted,
          loading: false,
        });
      } catch {
        // transient error — next poll/event will retry
      }
    }

    fetchOnce();

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const channel = supabase
        .channel(`session-${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions", filter: `code=eq.${code}` },
          () => fetchOnce()
        )
        .subscribe();
      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }

    timer = setInterval(fetchOnce, pollIntervalMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [code, pollIntervalMs]);

  return state;
}
