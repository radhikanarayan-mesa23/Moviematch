"use client";

import { useState } from "react";
import { Chip } from "./Chip";
import type { Era, LanguageCode, MinRating, Mood, Preferences } from "@/lib/types";

const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: "light", label: "Light & fun" },
  { value: "intense", label: "Intense & gripping" },
  { value: "scary", label: "Scary" },
  { value: "romantic", label: "Romantic" },
  { value: "other", label: "Other" },
];

const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: "hi", label: "Hindi" },
  { value: "en", label: "English" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "any", label: "Any" },
];

const RATING_OPTIONS: { value: MinRating; label: string; caveat?: string }[] = [
  { value: 6, label: "6+" },
  { value: 7, label: "7+" },
  { value: 8, label: "8+" },
  { value: 9, label: "9+", caveat: "very few titles" },
];

const ERA_OPTIONS: { value: Era; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "classic", label: "Classic (pre-2000)" },
  { value: "mid", label: "2000–2020" },
  { value: "recent", label: "Recent (2021–2026)" },
];

const DEFAULT_PREFERENCES: Preferences = {
  moods: [],
  moodText: "",
  languages: ["any"],
  contentType: "movies",
  minRating: 7,
  eras: ["any"],
};

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function toggleWithAny<T extends string>(arr: T[], value: T, anyValue: T): T[] {
  if (value === anyValue) return [anyValue];
  const withoutAny = arr.filter((v) => v !== anyValue);
  return toggleInArray(withoutAny, value);
}

interface PreferenceFormProps {
  onSubmit: (prefs: Preferences) => void;
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
}

export function PreferenceForm({ onSubmit, submitting, submitLabel, error }: PreferenceFormProps) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  const canSubmit = prefs.moods.length > 0 && !submitting;

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(prefs);
      }}
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Mood</h2>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={prefs.moods.includes(opt.value)}
              onClick={() => setPrefs((p) => ({ ...p, moods: toggleInArray(p.moods, opt.value) }))}
            />
          ))}
        </div>
        <textarea
          placeholder="Describe what you're in the mood for tonight (optional)"
          value={prefs.moodText}
          onChange={(e) => setPrefs((p) => ({ ...p, moodText: e.target.value }))}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent-to)] resize-none"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Language</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={prefs.languages.includes(opt.value)}
              onClick={() =>
                setPrefs((p) => ({ ...p, languages: toggleWithAny(p.languages, opt.value, "any") }))
              }
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Content type</h2>
        <div className="flex flex-wrap gap-2">
          <Chip
            label="Movies only"
            selected={prefs.contentType === "movies"}
            onClick={() => setPrefs((p) => ({ ...p, contentType: "movies" }))}
          />
          <Chip
            label="Include series"
            selected={prefs.contentType === "series"}
            onClick={() => setPrefs((p) => ({ ...p, contentType: "series" }))}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Minimum IMDb rating</h2>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              caveat={opt.caveat}
              selected={prefs.minRating === opt.value}
              onClick={() => setPrefs((p) => ({ ...p, minRating: opt.value }))}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Era</h2>
        <div className="flex flex-wrap gap-2">
          {ERA_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={prefs.eras.includes(opt.value)}
              onClick={() => setPrefs((p) => ({ ...p, eras: toggleWithAny(p.eras, opt.value, "any") }))}
            />
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={!canSubmit}>
        {submitting ? "Please wait…" : submitLabel}
      </button>
      {prefs.moods.length === 0 && (
        <p className="text-center text-xs text-[var(--text-faint)] -mt-4">Pick at least one mood to continue</p>
      )}
    </form>
  );
}
