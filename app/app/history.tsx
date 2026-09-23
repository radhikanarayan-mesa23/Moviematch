import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen, Heading, Card, PrimaryButton } from '../components/ui';
import { colors, spacing, type } from '../lib/theme';
import { api, HistoryEntry } from '../lib/api';
import { getDeviceId } from '../lib/deviceId';

function statusLabel(status: string): string {
  switch (status) {
    case 'matched':
      return 'Matched';
    case 'final_pick':
      return 'Shortlist only';
    case 'done':
      return 'Done';
    default:
      return 'In progress';
  }
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const res = await api.getHistory(deviceId);
      setEntries(res.sessions);
    } catch {
      setError('Could not load your history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <Heading title="History" subtitle="Past sessions on this device" />

      {loading && !entries ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : entries && entries.length === 0 ? (
        <Text style={styles.empty}>No sessions yet — start one from the home screen.</Text>
      ) : (
        <FlatList
          data={entries ?? []}
          keyExtractor={(item) => item.code}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.status}>{statusLabel(item.status)}</Text>
              </View>
              {item.matchedTitle ? (
                <Text style={styles.matchTitle}>
                  {item.matchedTitle.title} ({item.matchedTitle.year})
                </Text>
              ) : (
                <Text style={styles.noMatch}>No match reached</Text>
              )}
              <Text style={styles.rating}>
                {item.yourRating ? `Your rating: ${item.yourRating}/5` : 'Not rated'}
              </Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </Card>
          )}
        />
      )}

      <View style={{ marginBottom: spacing.md }}>
        <PrimaryButton label="Back to home" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.danger,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  code: {
    ...type.bodyBold,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  status: {
    ...type.small,
    color: colors.accent,
  },
  matchTitle: {
    ...type.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noMatch: {
    ...type.body,
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  rating: {
    ...type.caption,
    color: colors.gold,
  },
  date: {
    ...type.small,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
});
