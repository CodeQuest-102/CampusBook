/**
 * CampusBook design system.
 *
 * Single source of truth for colors, spacing, radius, typography and shadows.
 * Every component and screen pulls from here so the app stays visually
 * consistent with the mockups.
 */

export const colors = {
  // Brand blues
  primary: '#0340CF', // action blue — buttons, active states, links
  primaryDark: '#0034AC', // deep brand blue — splash bg, bottom banner
  primaryPressed: '#022E9A', // slightly darker for pressed button states
  primarySoft: '#E7EDFC', // tinted blue for chips / highlighted cards

  // Neutrals / surfaces
  background: '#FFFFFF',
  card: '#F4F6FA', // light grey card surface
  cardAlt: '#EEF1F6',
  border: '#E3E7EF',
  divider: '#EDEFF3',

  // Text
  text: '#111827', // near-black headings
  textSecondary: '#5B6472', // muted body / labels
  textTertiary: '#9AA2B1', // placeholders / captions
  textOnPrimary: '#FFFFFF',

  // Status (available / pending / rejected / maintenance)
  success: '#1FA85B', // green  — available / approved
  successSoft: '#E3F6EC',
  warning: '#F4A62A', // amber  — pending
  warningSoft: '#FDF1DC',
  danger: '#E4483C', // red    — rejected / cancelled
  dangerSoft: '#FBE6E4',
  maintenance: '#F2792B', // orange — under maintenance
  maintenanceSoft: '#FCE9DC',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(17, 24, 39, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Reusable text presets used across screens. */
export const typography = {
  display: { fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.text },
  h1: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text },
  h2: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  h3: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text },
  bodyMuted: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.textSecondary },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.textTertiary },
} as const;

export const shadow = {
  // subtle card shadow (iOS + Android)
  card: {
    shadowColor: '#0B1B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0B1B3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const theme = { colors, spacing, radius, fontSize, fontWeight, typography, shadow };
export type Theme = typeof theme;
export default theme;
