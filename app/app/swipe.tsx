import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/ui';
import { SwipeCard, SwipeDirection } from '../components/SwipeCard';
import { colors, radius, spacing, type } from '../lib/theme';
import { api, ApiError, Title } from '../lib/api';
import { getDeviceId } from '../lib/deviceId';

const POLL_MS = 2000;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Phase = 'loading-pool' | 'ready' | 'waiting-for-partner' | 'error';

export default function SwipeScreen() {
  const params = useLocalSearchParams<{ code: string; round?: string }>();
  const code = params.code;
  const [round, setRound] = useState<number>(params.round ? Number(params.round) : 1);
  const [pool, setPool] = useState<Title[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading-pool');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);

  const loadPool = useCallback(async (forRound: number, attempt = 0) => {
    setPhase('loading-pool');
    try {
      const res = await api.getPool(code, forRound);
      setPool(shuffle(res.titles));
      setIndex(0);
      setPhase('ready');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404 && attempt < 30) {
        // Pool still generating — retry shortly.
        setTimeout(() => loadPool(forRound, attempt + 1), POLL_MS);
      } else {
        setErrorMsg('Could not load this round. Pull to retry.');
        setPhase('error');
      }
    }
  }, [code]);

  useEffect(() => {
    getDeviceId().then((id) => {
      deviceIdRef.current = id;
      loadPool(round);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll session status once this device has swiped through the whole pool,
  // to learn whether we matched, move to round 2, or land on the final pick.
  useEffect(() => {
    if (phase !== 'waiting-for-partner') return;
    let cancelled = false;

    const tick = async () => {
      try {
        const s = await api.getSession(code);
        if (cancelled || navigatedRef.current) return;

        if (s.status === 'matched') {
          navigatedRef.current = true;
          router.replace({ pathname: '/match', params: { code } });
        } else if (s.status === 'final_pick') {
          navigatedRef.current = true;
          router.replace({ pathname: '/final-pick', params: { code } });
        } else if (s.status === 'swiping' && s.round > round) {
          setRound(s.round);
          loadPool(s.round);
        }
        // status 'generating' or 'swiping' at same round: keep waiting.
      } catch {
        // transient network hiccup — keep polling
      }
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, code, round, loadPool]);

  const currentTitle = pool[index];

  const handleSwiped = useCallback(
    (direction: SwipeDirection) => {
      const swiped = currentTitle;
      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (nextIndex >= pool.length) {
        setPhase('waiting-for-partner');
      }

      if (swiped && deviceIdRef.current) {
        api
          .swipe(code, {
            deviceId: deviceIdRef.current,
            round,
            tmdbId: swiped.tmdbId,
            direction: direction === 'right' ? 'right' : 'left',
          })
          .catch(() => {
            // best-effort — a dropped swipe just means this title won't count
            // toward a mutual match, it doesn't block the UI.
          });
      }
    },
    [code, currentTitle, index, pool.length, round]
  );

  const handleButtonSwipe = (direction: SwipeDirection) => {
    if (phase !== 'ready' || !currentTitle) return;
    handleSwiped(direction);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.roundLabel}>Round {round}</Text>
        <Text style={styles.progress}>
          {Math.min(index, pool.length)} / {pool.length}
        </Text>
      </View>

      <View style={styles.deckWrap}>
        {phase === 'loading-pool' && (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Curating your titles...</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.centerFill}>
            <Text style={styles.centerText}>{errorMsg}</Text>
          </View>
        )}

        {phase === 'waiting-for-partner' && (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Waiting on your partner to finish this round...</Text>
          </View>
        )}

        {phase === 'ready' &&
          pool.slice(index, index + 3).map((item, i) => (
            <SwipeCard
              key={item.tmdbId}
              item={item}
              isTop={i === 0}
              stackIndex={i}
              onSwiped={handleSwiped}
            />
          ))}
      </View>

      {phase === 'ready' && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.nopeButton]}
            onPress={() => handleButtonSwipe('left')}
          >
            <Text style={styles.actionIcon}>✕</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleButtonSwipe('right')}
          >
            <Text style={styles.actionIcon}>♥</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roundLabel: {
    ...type.h2,
    color: colors.text,
  },
  progress: {
    ...type.caption,
    color: colors.textDim,
  },
  deckWrap: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  centerText: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nopeButton: {
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  likeButton: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  actionIcon: {
    fontSize: 28,
    color: colors.text,
  },
});
