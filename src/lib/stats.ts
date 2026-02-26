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
  xp: number;
  level: number;
}

export interface RankInfo {
  title: string;
  color: string;
  minWins: number;
  nextWins: number | null;
  progress: number; // 0..1 within current rank
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  goal: number;
}

export interface LevelInfo {
  level: number;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number;
  progress: number; // 0..1 within current level
}

export interface ProgressUpdate {
  stats: GameStats;
  level: LevelInfo;
  gainedXp: number;
  leveledUp: boolean;
}

const STATS_KEY = 'ek_stats';
const BASE_LEVEL_XP = 120;
const LEVEL_XP_STEP = 40;

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
  const level = getLevelInfo(merged);
  merged.level = level.level;
  localStorage.setItem(STATS_KEY, JSON.stringify(merged));
}

export function recordWin(): ProgressUpdate {
  return mutateStats(stats => {
    stats.gamesPlayed++;
    stats.wins++;
    stats.winStreak++;
    if (stats.winStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.winStreak;
    }
    const streakBonus = Math.min(60, Math.max(0, stats.winStreak - 1) * 8);
    return 120 + streakBonus;
  });
}

export function recordLoss(): ProgressUpdate {
  return mutateStats(stats => {
    stats.gamesPlayed++;
    stats.losses++;
    stats.winStreak = 0;
    return 35;
  });
}

export function recordExplosion(): ProgressUpdate {
  return mutateStats(stats => {
    stats.explosions++;
    return 8;
  });
}

export function recordCardPlayed(): ProgressUpdate {
  return mutateStats(stats => {
    stats.cardsPlayed++;
    return 6;
  });
}

export function recordCardsStolen(count = 1): ProgressUpdate {
  return mutateStats(stats => {
    const stolen = Math.max(0, count);
    stats.cardsStolen += stolen;
    return stolen * 16;
  });
}

export function recordDefuseUsed(count = 1): ProgressUpdate {
  return mutateStats(stats => {
    const used = Math.max(0, count);
    stats.defusesUsed += used;
    return used * 20;
  });
}

export function getRankInfo(stats: GameStats): RankInfo {
  const tiers: Array<{ title: string; color: string; minWins: number }> = [
    { title: 'Rookie Spark', color: '#9CA3AF', minWins: 0 },
    { title: 'Fuse Runner', color: '#22C55E', minWins: 3 },
    { title: 'Chaos Tactician', color: '#06B6D4', minWins: 8 },
    { title: 'Card Predator', color: '#F59E0B', minWins: 16 },
    { title: 'Bomb Whisperer', color: '#F97316', minWins: 28 },
    { title: 'Kitten Warlord', color: '#EF4444', minWins: 45 },
  ];

  let currentTier = tiers[0];
  let nextTier: { title: string; color: string; minWins: number } | null = null;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (stats.wins >= tier.minWins) {
      currentTier = tier;
      nextTier = tiers[i + 1] ?? null;
    }
  }

  if (!nextTier) {
    return {
      title: currentTier.title,
      color: currentTier.color,
      minWins: currentTier.minWins,
      nextWins: null,
      progress: 1,
    };
  }

  const span = Math.max(1, nextTier.minWins - currentTier.minWins);
  const raw = (stats.wins - currentTier.minWins) / span;

  return {
    title: currentTier.title,
    color: currentTier.color,
    minWins: currentTier.minWins,
    nextWins: nextTier.minWins,
    progress: Math.max(0, Math.min(1, raw)),
  };
}

export function getAchievements(stats: GameStats): Achievement[] {
  const defs: Array<Omit<Achievement, 'unlocked' | 'progress'> & { metric: keyof GameStats }> = [
    {
      id: 'first-win',
      emoji: '🏆',
      title: 'First Blood',
      description: 'Win your first match.',
      metric: 'wins',
      goal: 1,
    },
    {
      id: 'cardslinger',
      emoji: '🃏',
      title: 'Card Slinger',
      description: 'Play 100 cards total.',
      metric: 'cardsPlayed',
      goal: 100,
    },
    {
      id: 'defuse-pro',
      emoji: '🔧',
      title: 'Defuse Pro',
      description: 'Use 15 Defuse cards.',
      metric: 'defusesUsed',
      goal: 15,
    },
    {
      id: 'sticky-fingers',
      emoji: '🥷',
      title: 'Sticky Fingers',
      description: 'Steal 25 cards from opponents.',
      metric: 'cardsStolen',
      goal: 25,
    },
    {
      id: 'streak-master',
      emoji: '🔥',
      title: 'Streak Master',
      description: 'Reach a 5-win streak.',
      metric: 'bestWinStreak',
      goal: 5,
    },
    {
      id: 'legend',
      emoji: '👑',
      title: 'Table Legend',
      description: 'Win 50 matches.',
      metric: 'wins',
      goal: 50,
    },
    {
      id: 'xp-grinder',
      emoji: '⭐',
      title: 'XP Grinder',
      description: 'Reach level 10.',
      metric: 'level',
      goal: 10,
    },
  ];

  return defs.map(def => {
    const value = stats[def.metric];
    const progress = Math.min(value, def.goal);
    return {
      id: def.id,
      emoji: def.emoji,
      title: def.title,
      description: def.description,
      goal: def.goal,
      progress,
      unlocked: value >= def.goal,
    };
  });
}

export function getLevelInfo(stats: GameStats): LevelInfo {
  const xp = Math.max(0, stats.xp || 0);
  let level = 1;
  let levelStartXp = 0;
  let requiredXp = BASE_LEVEL_XP;

  while (xp >= levelStartXp + requiredXp) {
    levelStartXp += requiredXp;
    requiredXp += LEVEL_XP_STEP;
    level++;
  }

  return {
    level,
    xp,
    levelStartXp,
    nextLevelXp: levelStartXp + requiredXp,
    progress: Math.max(0, Math.min(1, (xp - levelStartXp) / requiredXp)),
  };
}

function mutateStats(mutator: (stats: GameStats) => number): ProgressUpdate {
  const stats = getStats();
  const previousLevel = getLevelInfo(stats).level;
  const gainedXp = Math.max(0, Math.round(mutator(stats)));
  stats.xp += gainedXp;
  const level = getLevelInfo(stats);
  stats.level = level.level;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  return {
    stats,
    level,
    gainedXp,
    leveledUp: level.level > previousLevel,
  };
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
    xp: 0,
    level: 1,
  };
}
