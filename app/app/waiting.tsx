import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card } from '../components/ui';
import { colors, spacing, type } from '../lib/theme';
import { api, SessionState } from '../lib/api';

const POLL_MS = 2000;

function statusCopy(state: SessionState | null): string {
  if (!state) return 'Connecting...';
  switch (state.status) {
    case 'waiting':
      return 'Waiting for your partner to join...';
    case 'collecting':
      return "Waiting on preferences from both of you...";
    case 'generating':
      return 'Both of you are in. Building your matches...';
    default:
      return 'Almost there...';
  }
}

export default function WaitingScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [state, setState] = useState<SessionState | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const navigated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const s = await api.getSession(code);
        if (cancelled) return;
        setState(s);
        setErrorCount(0);

        if (navigated.current) return;
        if (s.status === 'swiping') {
          navigated.current = true;
          router.replace({ pathname: '/swipe', params: { code, round: String(s.round) } });
        } else if (s.status === 'matched') {
          navigated.current = true;
          router.replace({ pathname: '/match', params: { code } });
        } else if (s.status === 'final_pick') {
          navigated.current = true;
          router.replace({ pathname: '/final-pick', params: { code } });
        }
      } catch {
        if (!cancelled) setErrorCount((c) => c + 1);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code]);

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.status}>{statusCopy(state)}</Text>

        <Card style={styles.card}>
          <Row label="Partner A" done={Boolean(state?.partnerASubmitted)} />
          <Row label="Partner B" done={Boolean(state?.partnerBSubmitted)} />
        </Card>

        <Text style={styles.code}>Session code: {code}</Text>
        {errorCount > 2 ? (
          <Text style={styles.error}>Having trouble reaching the server. Still trying...</Text>
        ) : null}
      </View>
    </Screen>
  );
}

function Row({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowStatus, done && styles.rowStatusDone]}>
        {done ? 'Submitted' : 'Waiting'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    ...type.h2,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  rowStatus: {
    ...type.bodyBold,
    color: colors.gold,
  },
  rowStatusDone: {
    color: colors.success,
  },
  code: {
    ...type.caption,
    color: colors.textDim,
    letterSpacing: 2,
  },
  error: {
    ...type.caption,
    color: colors.danger,
    marginTop: spacing.md,
  },
});
