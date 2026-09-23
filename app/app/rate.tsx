import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, PrimaryButton } from '../components/ui';
import { colors, spacing, type } from '../lib/theme';
import { api, ApiError } from '../lib/api';
import { getDeviceId } from '../lib/deviceId';

export default function RateScreen() {
  const { code, tmdbId } = useLocalSearchParams<{ code: string; tmdbId: string }>();
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const [deviceId, session] = await Promise.all([getDeviceId(), api.getSession(code)]);
      await api.submitRating({
        sessionId: session.id,
        deviceId,
        tmdbId: Number(tmdbId),
        rating,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your rating. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <View style={styles.centerFill}>
          <Text style={styles.doneEmoji}>🌟</Text>
          <Text style={styles.doneTitle}>Thanks for rating!</Text>
          <View style={{ height: spacing.lg }} />
          <PrimaryButton label="Back to home" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading title="How was it?" subtitle="Rate tonight's pick from 1 to 5." />

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={8}>
            <Text style={[styles.star, n <= rating && styles.starFilled]}>{n <= rating ? '★' : '☆'}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton label="Submit rating" onPress={handleSubmit} disabled={rating < 1} loading={submitting} />
        <View style={{ height: spacing.md }} />
        <PrimaryButton label="Skip" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
  },
  star: {
    fontSize: 44,
    color: colors.textDim,
    marginHorizontal: spacing.xs,
  },
  starFilled: {
    color: colors.gold,
  },
  error: {
    ...type.caption,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  actions: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneEmoji: {
    fontSize: 56,
  },
  doneTitle: {
    ...type.h1,
    color: colors.text,
    marginTop: spacing.md,
  },
});
