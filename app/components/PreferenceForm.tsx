import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CONTENT_TYPE_OPTIONS,
  ERA_OPTIONS,
  LANGUAGE_OPTIONS,
  MIN_RATING_OPTIONS,
  MOOD_OPTIONS,
  colors,
  radius,
  spacing,
  type,
} from '../lib/theme';
import { ProfileBody } from '../lib/api';
import { Chip, PrimaryButton, SectionLabel } from './ui';

type FormValue = Omit<ProfileBody, 'deviceId'>;

export function PreferenceForm({
  onSubmit,
  submitting,
  submitLabel = "I'm ready",
}: {
  onSubmit: (value: FormValue) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [moods, setMoods] = useState<string[]>([]);
  const [moodText, setMoodText] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [contentType, setContentType] = useState<FormValue['contentType']>('include_series');
  const [minRating, setMinRating] = useState<FormValue['minRating']>(6);
  const [eras, setEras] = useState<string[]>([]);

  const toggleMood = (value: string) => {
    setMoods((prev) => (prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]));
  };

  const toggleLanguage = (value: string) => {
    setLanguages((prev) => {
      if (value === 'any') return prev.includes('any') ? [] : ['any'];
      const withoutAny = prev.filter((l) => l !== 'any');
      return withoutAny.includes(value)
        ? withoutAny.filter((l) => l !== value)
        : [...withoutAny, value];
    });
  };

  const toggleEra = (value: string) => {
    setEras((prev) => {
      if (value === 'any') return prev.includes('any') ? [] : ['any'];
      const withoutAny = prev.filter((e) => e !== 'any');
      return withoutAny.includes(value)
        ? withoutAny.filter((e) => e !== value)
        : [...withoutAny, value];
    });
  };

  const canSubmit =
    moods.length > 0 && languages.length > 0 && eras.length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ moods, moodText, languages, contentType, minRating, eras });
  };

  return (
    <View>
      <SectionLabel>What's the mood?</SectionLabel>
      <View style={styles.chipRow}>
        {MOOD_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={moods.includes(opt.value)}
            onPress={() => toggleMood(opt.value)}
          />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="What are you in the mood for tonight? (optional)"
        placeholderTextColor={colors.textDim}
        value={moodText}
        onChangeText={setMoodText}
        multiline
      />

      <SectionLabel>Languages</SectionLabel>
      <View style={styles.chipRow}>
        <Chip label="Any" selected={languages.includes('any')} onPress={() => toggleLanguage('any')} />
        {LANGUAGE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={languages.includes(opt.value)}
            onPress={() => toggleLanguage(opt.value)}
          />
        ))}
      </View>

      <SectionLabel>Movies or series?</SectionLabel>
      <View style={styles.chipRow}>
        {CONTENT_TYPE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={contentType === opt.value}
            onPress={() => setContentType(opt.value)}
          />
        ))}
      </View>

      <SectionLabel>Minimum rating</SectionLabel>
      <View style={styles.chipRow}>
        {MIN_RATING_OPTIONS.map((rating) => (
          <View key={rating} style={styles.ratingChipWrap}>
            <Chip
              label={`${rating}+`}
              selected={minRating === rating}
              onPress={() => setMinRating(rating)}
            />
            {rating === 9 ? <Text style={styles.caveat}>very few titles</Text> : null}
          </View>
        ))}
      </View>

      <SectionLabel>Era</SectionLabel>
      <View style={styles.chipRow}>
        <Chip label="Any" selected={eras.includes('any')} onPress={() => toggleEra('any')} />
        {ERA_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={eras.includes(opt.value)}
            onPress={() => toggleEra(opt.value)}
          />
        ))}
      </View>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <PrimaryButton label={submitLabel} onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
        {!canSubmit && !submitting ? (
          <Text style={styles.hint}>Pick at least one mood, language, and era to continue.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    minHeight: 48,
  },
  ratingChipWrap: {
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  caveat: {
    ...type.small,
    color: colors.gold,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  hint: {
    ...type.caption,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
