import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, PrimaryButton } from '../components/ui';
import { colors, spacing, type } from '../lib/theme';
import { api, ApiError } from '../lib/api';
import { getDeviceId } from '../lib/deviceId';

export default function HomeScreen() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setCreating(true);
    try {
      const deviceId = await getDeviceId();
      const session = await api.createSession(deviceId);
      router.push({ pathname: '/qr', params: { code: session.code } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start a session. Is the server running?');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🍿</Text>
        <Text style={styles.title}>Movie Match</Text>
        <Text style={styles.subtitle}>
          Same couch, two phones, one perfect pick. Swipe your way to tonight's watch.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Start a session" onPress={handleStart} loading={creating} />
        <View style={{ height: spacing.md }} />
        <PrimaryButton
          label="Join a session"
          variant="secondary"
          onPress={() => router.push('/join')}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="View history" variant="ghost" onPress={() => router.push('/history')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...type.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  error: {
    ...type.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    marginBottom: spacing.md,
  },
});
