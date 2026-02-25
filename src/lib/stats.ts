'use client';

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  explosions: number;
  cardsPlayed: number;
  cardsStolen: number;
  defusesUsed: number;
  winStreak: number;
  bestWinStreak: number;
}

const STATS_KEY = 'ek_stats';

export function getStats(): GameStats {
  if (typeof window === 'undefined') return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

export function updateStats(updates: Partial<GameStats>) {
  if (typeof window === 'undefined') return;
  const stats = getStats();
  const merged = { ...stats, ...updates };
  localStorage.setItem(STATS_KEY, JSON.stringify(merged));
}

export function recordWin() {
  const stats = getStats();
  stats.gamesPlayed++;
  stats.wins++;
  stats.winStreak++;
  if (stats.winStreak > stats.bestWinStreak) {
    stats.bestWinStreak = stats.winStreak;
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordLoss() {
  const stats = getStats();
  stats.gamesPlayed++;
  stats.losses++;
  stats.winStreak = 0;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordExplosion() {
  const stats = getStats();
  stats.explosions++;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordCardPlayed() {
  const stats = getStats();
  stats.cardsPlayed++;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function defaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    explosions: 0,
    cardsPlayed: 0,
    cardsStolen: 0,
    defusesUsed: 0,
    winStreak: 0,
    bestWinStreak: 0,
  };
}
