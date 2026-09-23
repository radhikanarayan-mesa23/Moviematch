import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Title } from '../lib/api';
import { colors, radius, spacing, type } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const ROTATION_DEG = 10;
const FLY_OUT_DISTANCE = SCREEN_WIDTH * 1.5;

export type SwipeDirection = 'left' | 'right';

export function SwipeCard({
  item,
  isTop,
  stackIndex,
  onSwiped,
}: {
  item: Title;
  isTop: boolean;
  stackIndex: number;
  onSwiped: (direction: SwipeDirection) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const finishSwipe = (direction: SwipeDirection) => {
    onSwiped(direction);
  };

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.4;
    })
    .onEnd((e) => {
      const velocityBoost = e.velocityX * 0.08;
      const projected = e.translationX + velocityBoost;

      if (projected > SWIPE_THRESHOLD) {
        translateX.value = withTiming(FLY_OUT_DISTANCE, { duration: 260 }, (finished) => {
          if (finished) runOnJS(finishSwipe)('right');
        });
      } else if (projected < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-FLY_OUT_DISTANCE, { duration: 260 }, (finished) => {
          if (finished) runOnJS(finishSwipe)('left');
        });
      } else {
        translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-ROTATION_DEG, 0, ROTATION_DEG],
      Extrapolation.CLAMP
    );
    const restScale = 1 - Math.min(stackIndex, 2) * 0.04;
    const restTranslateY = Math.min(stackIndex, 2) * -10;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + (isTop ? 0 : restTranslateY) },
        { rotateZ: `${rotate}deg` },
        { scale: isTop ? 1 : restScale },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [10, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -10], [1, 0], Extrapolation.CLAMP),
  }));

  const cardBody = (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.posterWrap}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.posterFallbackText}>{item.title}</Text>
          </View>
        )}
        <View style={styles.gradientOverlay} />

        {isTop && (
          <Animated.View style={[styles.badge, styles.likeBadge, likeStyle]}>
            <Text style={styles.badgeText}>LIKE</Text>
          </Animated.View>
        )}
        {isTop && (
          <Animated.View style={[styles.badge, styles.nopeBadge, nopeStyle]}>
            <Text style={styles.badgeText}>NOPE</Text>
          </Animated.View>
        )}

        <View style={styles.infoOverlay}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.year}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>★ {item.rating.toFixed(1)}</Text>
            {item.runtimeMinutes ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{item.runtimeMinutes} min</Text>
              </>
            ) : null}
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{item.mediaType === 'tv' ? 'Series' : 'Movie'}</Text>
          </View>
          <Text style={styles.synopsis} numberOfLines={3}>
            {item.synopsis}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  if (!isTop) return cardBody;

  return <GestureDetector gesture={pan}>{cardBody}</GestureDetector>;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  posterWrap: {
    flex: 1,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  posterFallbackText: {
    ...type.h2,
    color: colors.textMuted,
    textAlign: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: colors.black,
    opacity: 0.55,
  },
  infoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  title: {
    ...type.h1,
    color: colors.white,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
    color: colors.white,
    opacity: 0.9,
  },
  badge: {
    position: 'absolute',
    top: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 3,
    zIndex: 10,
  },
  likeBadge: {
    left: spacing.lg,
    borderColor: colors.success,
    transform: [{ rotateZ: '-18deg' }],
  },
  nopeBadge: {
    right: spacing.lg,
    borderColor: colors.danger,
    transform: [{ rotateZ: '18deg' }],
  },
  badgeText: {
    ...type.h2,
    color: colors.white,
    letterSpacing: 2,
  },
});
