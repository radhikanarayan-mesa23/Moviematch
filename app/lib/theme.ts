// Design tokens shared across the app so screens read as one coherent product
// instead of a pile of ad-hoc inline styles.

export const colors = {
  bg: '#0F1020',
  bgAlt: '#171935',
  surface: '#1E2142',
  surfaceAlt: '#262A52',
  card: '#FFFFFF',
  border: '#33366A',
  text: '#FFFFFF',
  textMuted: '#A6A9D6',
  textDim: '#7376A8',
  primary: '#FF5E7E',
  primaryDark: '#E14367',
  secondary: '#6C63FF',
  accent: '#2FE6C6',
  gold: '#FFC65C',
  success: '#33D69F',
  danger: '#FF5E7E',
  overlayLike: '#33D69F',
  overlayNope: '#FF5E7E',
  black: '#0A0A14',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '700' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 11, fontWeight: '600' as const },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
};

export const MOOD_OPTIONS = [
  { value: 'light_fun', label: 'Light & Fun' },
  { value: 'intense_gripping', label: 'Intense & Gripping' },
  { value: 'scary', label: 'Scary' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'other', label: 'Something else' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'hindi', label: 'Hindi' },
  { value: 'english', label: 'English' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'kannada', label: 'Kannada' },
] as const;

export const CONTENT_TYPE_OPTIONS = [
  { value: 'movies_only', label: 'Movies only' },
  { value: 'include_series', label: 'Movies + Series' },
] as const;

export const MIN_RATING_OPTIONS = [6, 7, 8, 9] as const;

export const ERA_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: '2000_2020', label: '2000-2020' },
  { value: 'recent', label: 'Recent' },
] as const;
