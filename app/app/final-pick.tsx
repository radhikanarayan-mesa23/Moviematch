import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, PrimaryButton, Card } from '../components/ui';
import { colors, radius, spacing, type } from '../lib/theme';
import { api, TitleWithScore } from '../lib/api';

export default function FinalPickScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [titles, setTitles] = useState<TitleWithScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFinalPick(code)
      .then((res) => setTitles(res.titles))
      .catch(() => setError('Could not load the shortlist. Try again shortly.'));
  }, [code]);

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Heading
            title="No mutual match yet"
            subtitle="Here are your combined top picks — decide together."
          />
        </View>

        {error ? (
          <Text style={[styles.error, { marginHorizontal: spacing.lg }]}>{error}</Text>
        ) : !titles ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {titles.map((t, i) => (
              <Card key={t.tmdbId} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                  </View>
                  {t.posterUrl ? (
                    <Image source={{ uri: t.posterUrl }} style={styles.poster} resizeMode="cover" />
                  ) : (
                    <View style={[styles.poster, styles.posterFallback]} />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {t.title}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {t.year} · ★ {t.rating.toFixed(1)}
                      {t.runtimeMinutes ? ` · ${t.runtimeMinutes} min` : ''}
                    </Text>
                    <Text style={styles.itemSynopsis} numberOfLines={2}>
                      {t.synopsis}
                    </Text>
                  </View>
                </View>
                <PrimaryButton
                  label="We picked this"
                  variant="secondary"
                  onPress={() =>
                    router.push({ pathname: '/rate', params: { code, tmdbId: String(t.tmdbId) } })
                  }
                />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    ...type.small,
    color: colors.black,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.md,
  },
  posterFallback: {},
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...type.bodyBold,
    color: colors.text,
  },
  itemMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  itemSynopsis: {
    ...type.caption,
    color: colors.textDim,
  },
});
