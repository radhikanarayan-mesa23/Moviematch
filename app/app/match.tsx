import React, { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Screen, PrimaryButton, Card } from '../components/ui';
import { colors, radius, spacing, type } from '../lib/theme';
import { api, MatchResponse } from '../lib/api';

const CONFETTI = ['🎉', '🍿', '✨', '🎬', '💫', '🎊'];

export default function MatchScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    api
      .getMatch(code)
      .then((res) => {
        setMatch(res);
        opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        scale.value = withSpring(1, { damping: 11, stiffness: 120 });
        badgeScale.value = withDelay(
          250,
          withSequence(withSpring(1.15, { damping: 6 }), withSpring(1, { damping: 8 }))
        );
      })
      .catch(() => setError("Couldn't load your match. Try reopening the app."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (error) {
    return (
      <Screen>
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (!match) {
    return (
      <Screen>
        <View style={styles.centerFill} />
      </Screen>
    );
  }

  const { title, ottPlatforms } = match;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.confettiRow} pointerEvents="none">
          {CONFETTI.map((emoji, i) => (
            <ConfettiPiece key={i} emoji={emoji} delay={i * 90} />
          ))}
        </View>

        <Animated.View style={badgeStyle}>
          <Text style={styles.matchLabel}>IT'S A MATCH!</Text>
        </Animated.View>

        <Animated.View style={[styles.posterCard, cardStyle]}>
          {title.posterUrl ? (
            <Image source={{ uri: title.posterUrl }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Text style={styles.posterFallbackText}>{title.title}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={cardStyle}>
          <Text style={styles.title}>{title.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{title.year}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>★ {title.rating.toFixed(1)}</Text>
            {title.runtimeMinutes ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{title.runtimeMinutes} min</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.synopsis}>{title.synopsis}</Text>

          <Text style={styles.sectionLabel}>Watch it now on</Text>
          {ottPlatforms.length === 0 ? (
            <Text style={styles.noPlatforms}>No Indian streaming availability found right now.</Text>
          ) : (
            ottPlatforms.map((p) => (
              <Card key={p.name} style={styles.platformCard}>
                <View style={styles.platformRow}>
                  <View>
                    <Text style={styles.platformName}>{p.name}</Text>
                    <Text style={styles.platformType}>{platformTypeLabel(p.type)}</Text>
                  </View>
                  <PrimaryButton label="Open" variant="secondary" onPress={() => Linking.openURL(p.url)} />
                </View>
              </Card>
            ))
          )}

          <View style={{ height: spacing.lg }} />
          <PrimaryButton
            label="Rate this pick"
            onPress={() => router.push({ pathname: '/rate', params: { code, tmdbId: String(title.tmdbId) } })}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function ConfettiPiece({ emoji, delay }: { emoji: string; delay: number }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(10, { duration: 700, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(
      delay,
      withSequence(withTiming(1, { duration: 200 }), withDelay(500, withTiming(0, { duration: 500 }))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={[styles.confettiEmoji, style]}>{emoji}</Animated.Text>;
}

function platformTypeLabel(type: string): string {
  switch (type) {
    case 'subscription':
      return 'Included with subscription';
    case 'rent':
      return 'Available to rent';
    case 'buy':
      return 'Available to buy';
    case 'free':
      return 'Free to watch';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...type.body,
    color: colors.danger,
  },
  confettiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: -spacing.md,
  },
  confettiEmoji: {
    fontSize: 22,
  },
  matchLabel: {
    ...type.display,
    color: colors.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  posterCard: {
    width: 220,
    height: 330,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  posterFallbackText: {
    ...type.h2,
    color: colors.textMuted,
    textAlign: 'center',
  },
  title: {
    ...type.h1,
    color: colors.text,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  metaText: {
    ...type.caption,
    color: colors.textMuted,
  },
  metaDot: {
    ...type.caption,
    color: colors.textDim,
    marginHorizontal: 6,
  },
  synopsis: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...type.h2,
    color: colors.text,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  noPlatforms: {
    ...type.body,
    color: colors.textDim,
  },
  platformCard: {
    width: '100%',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformName: {
    ...type.bodyBold,
    color: colors.text,
  },
  platformType: {
    ...type.small,
    color: colors.textDim,
    marginTop: 2,
  },
});
