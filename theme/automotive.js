export const colors = {
  bg: '#081015',
  surface: '#111c25',
  surfaceRaised: '#162331',
  surfaceDeep: '#071016',
  border: '#253442',
  borderStrong: '#355064',
  text: '#f5f7fa',
  textMuted: '#8fa1b3',
  textSoft: '#d7e1ea',
  cyan: '#66fcf1',
  amber: '#f39c12',
  green: '#2ecc71',
  red: '#e74c3c',
  redSoft: '#ffb4a9',
  blue: '#4aa3ff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 6,
  md: 8,
};

export const typography = {
  title: { color: colors.text, fontSize: 23, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  section: { color: colors.text, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  value: { color: colors.cyan, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  mono: { fontFamily: 'monospace', fontVariant: ['tabular-nums'] },
};

export const shadows = {
  panel: {
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
  },
};
