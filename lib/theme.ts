import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background: '#FFFFFF',
    surface: '#F7F7F8',
    surfaceRaised: '#FFFFFF',
    border: '#E9E9EC',
    text: '#1A1A1E',
    textSecondary: '#8B8B93',
    textTertiary: '#B4B4BA',
    accent: '#4A5DFF',
    accentSoft: '#EEF0FF',
    danger: '#E5484D',
    overlay: 'rgba(20,20,24,0.4)',
  },
  dark: {
    background: '#111113',
    surface: '#1B1B1E',
    surfaceRaised: '#212125',
    border: '#2C2C31',
    text: '#F3F3F5',
    textSecondary: '#9A9AA2',
    textTertiary: '#6E6E76',
    accent: '#7B8AFF',
    accentSoft: '#22243D',
    danger: '#F2555A',
    overlay: 'rgba(0,0,0,0.55)',
  },
};

export const calendarColors = [
  '#4A5DFF',
  '#FF8A5B',
  '#2BB673',
  '#FFB020',
  '#B15CFF',
  '#00B4C5',
  '#FF5C8A',
  '#6E7B8B',
];

export const localCalendarColor = '#14B8A6';

export const categoryColors: Record<'work' | 'personal' | 'content', string> = {
  work: '#4A5DFF',
  personal: '#2BB673',
  content: '#FF8A5B',
};

export const categoryLabels: Record<'work' | 'personal' | 'content', string> = {
  work: 'Work',
  personal: 'Personal',
  content: 'Content',
};

export type Theme = typeof palette.light & {
  scheme: 'light' | 'dark';
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number };
};

const spacing = (n: number) => n * 4;
const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? palette.dark : palette.light;
  return { ...colors, scheme: scheme === 'dark' ? 'dark' : 'light', spacing, radius };
}
