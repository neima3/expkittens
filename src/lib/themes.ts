export type ThemeId = 'classic' | 'obsidian' | 'neon' | 'pixel' | 'minimalist';

export interface CardBackStyle {
  background: string;
  border: string;
  emoji: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  description: string;
  premium?: boolean;
  variables: Record<string, string>;
  cardBack: CardBackStyle;
  bodyBackground: string;
}

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'Classic',
    emoji: '💜',
    description: 'The original deep purple arena',
    variables: {
      '--color-bg': '#090714',
      '--color-surface': '#130f25',
      '--color-surface-light': '#1f183b',
      '--color-accent': '#ff5f2e',
      '--color-accent-hover': '#ff844f',
      '--color-danger': '#ff3355',
      '--color-success': '#2bd47c',
      '--color-warning': '#ffb833',
      '--color-text': '#f8f6ff',
      '--color-text-muted': '#a097bd',
      '--color-border': '#3b2d5c',
    },
    cardBack: {
      background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
      border: '#3b2d5c',
      emoji: '🐾',
    },
    bodyBackground:
      'radial-gradient(circle at 10% 10%, rgba(255, 95, 46, 0.15), transparent 40%), radial-gradient(circle at 90% 20%, rgba(139, 44, 255, 0.12), transparent 40%), radial-gradient(circle at 50% 100%, rgba(43, 212, 124, 0.08), transparent 50%), linear-gradient(160deg, #0a0714 0%, #0d0a1b 40%, #110d23 100%)',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    emoji: '🌑',
    description: 'Pure black with sky-blue highlights',
    variables: {
      '--color-bg': '#040408',
      '--color-surface': '#0c0c14',
      '--color-surface-light': '#131320',
      '--color-accent': '#7dd3fc',
      '--color-accent-hover': '#a5e1ff',
      '--color-danger': '#ef4444',
      '--color-success': '#34d399',
      '--color-warning': '#fbbf24',
      '--color-text': '#f0f0ff',
      '--color-text-muted': '#6070a0',
      '--color-border': '#20203c',
    },
    cardBack: {
      background: 'linear-gradient(155deg, #0c0c14 0%, #040408 100%)',
      border: '#20203c',
      emoji: '🌑',
    },
    bodyBackground:
      'radial-gradient(circle at 20% 10%, rgba(125, 211, 252, 0.08), transparent 40%), radial-gradient(circle at 80% 90%, rgba(52, 211, 153, 0.06), transparent 40%), linear-gradient(160deg, #020205 0%, #040408 40%, #060610 100%)',
  },
  {
    id: 'neon',
    name: 'Neon City',
    emoji: '⚡',
    description: 'Cyberpunk electric-green glow',
    variables: {
      '--color-bg': '#020612',
      '--color-surface': '#070e1e',
      '--color-surface-light': '#0e1930',
      '--color-accent': '#00ff88',
      '--color-accent-hover': '#33ffaa',
      '--color-danger': '#ff1a6e',
      '--color-success': '#00ddcc',
      '--color-warning': '#ffea00',
      '--color-text': '#e0ffee',
      '--color-text-muted': '#4d9970',
      '--color-border': '#004433',
    },
    cardBack: {
      background: 'linear-gradient(155deg, #070e1e 0%, #020612 100%)',
      border: '#004433',
      emoji: '⚡',
    },
    bodyBackground:
      'radial-gradient(circle at 30% 20%, rgba(0, 255, 136, 0.12), transparent 40%), radial-gradient(circle at 70% 80%, rgba(0, 221, 204, 0.08), transparent 40%), radial-gradient(circle at 90% 10%, rgba(255, 26, 110, 0.10), transparent 35%), linear-gradient(160deg, #010508 0%, #020612 40%, #030916 100%)',
  },
  {
    id: 'pixel',
    name: 'Pixel Forge',
    emoji: '🎮',
    description: 'Retro 8-bit warm amber vibes',
    variables: {
      '--color-bg': '#0f0a06',
      '--color-surface': '#1c1208',
      '--color-surface-light': '#2c1e10',
      '--color-accent': '#f59e0b',
      '--color-accent-hover': '#fbbf24',
      '--color-danger': '#ef4444',
      '--color-success': '#84cc16',
      '--color-warning': '#f97316',
      '--color-text': '#fef3c7',
      '--color-text-muted': '#a37c50',
      '--color-border': '#4a2f10',
    },
    cardBack: {
      background: 'linear-gradient(155deg, #2c1e10 0%, #0f0a06 100%)',
      border: '#4a2f10',
      emoji: '🎮',
    },
    bodyBackground:
      'radial-gradient(circle at 25% 15%, rgba(245, 158, 11, 0.12), transparent 40%), radial-gradient(circle at 75% 85%, rgba(249, 115, 22, 0.10), transparent 40%), linear-gradient(160deg, #0a0603 0%, #0f0a06 40%, #140d08 100%)',
  },
  {
    id: 'minimalist',
    name: 'Minimal',
    emoji: '◾',
    description: 'Clean charcoal — zero distractions',
    variables: {
      '--color-bg': '#0a0a0a',
      '--color-surface': '#111111',
      '--color-surface-light': '#1a1a1a',
      '--color-accent': '#e5e5e5',
      '--color-accent-hover': '#ffffff',
      '--color-danger': '#ff3366',
      '--color-success': '#00cc66',
      '--color-warning': '#ffcc00',
      '--color-text': '#f0f0f0',
      '--color-text-muted': '#666666',
      '--color-border': '#222222',
    },
    cardBack: {
      background: 'linear-gradient(155deg, #1a1a1a 0%, #0a0a0a 100%)',
      border: '#222222',
      emoji: '◾',
    },
    bodyBackground:
      'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.03), transparent 50%), linear-gradient(160deg, #080808 0%, #0a0a0a 40%, #0d0d0d 100%)',
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'classic';

export function getTheme(id: ThemeId): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

/** Serialised variable map for the anti-flash inline script */
export const THEME_VARIABLE_MAP: Record<ThemeId, Record<string, string>> = Object.fromEntries(
  THEMES.map(t => [t.id, t.variables])
) as Record<ThemeId, Record<string, string>>;
