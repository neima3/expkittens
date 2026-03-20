'use client';

import type { GameState } from '@/types/game';

export interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  bonusXp: number;
}

export interface ChallengeCompletion {
  date: string; // YYYY-MM-DD
  challengeId: string;
  completedAt: number;
}

const CHALLENGE_KEY = 'ek_daily_challenge';

const CHALLENGES: DailyChallenge[] = [
  {
    id: 'attack-winner',
    emoji: '⚔️',
    title: 'Aggressor',
    description: 'Win a game after playing an Attack card.',
    bonusXp: 200,
  },
  {
    id: 'nope-master',
    emoji: '✋',
    title: 'Nope Master',
    description: 'Win a game after playing a Nope card.',
    bonusXp: 200,
  },
  {
    id: 'shuffle-win',
    emoji: '🔀',
    title: 'Deck Shaker',
    description: 'Win a game after playing a Shuffle card.',
    bonusXp: 200,
  },
  {
    id: 'defuse-hero',
    emoji: '🔧',
    title: 'Defuse Hero',
    description: 'Win a game after defusing an Exploding Kitten.',
    bonusXp: 250,
  },
  {
    id: 'favor-winner',
    emoji: '🎁',
    title: 'Favor Seeker',
    description: 'Win a game after playing a Favor card.',
    bonusXp: 200,
  },
  {
    id: 'cat-combo-win',
    emoji: '🌮',
    title: 'Cat Combo',
    description: 'Win a game after playing a pair of cat cards.',
    bonusXp: 225,
  },
  {
    id: 'see-future-win',
    emoji: '🔮',
    title: 'Fortune Teller',
    description: 'Win a game after using See the Future.',
    bonusXp: 200,
  },
  {
    id: 'triple-cat-win',
    emoji: '🐱',
    title: 'Triple Threat',
    description: 'Win a game after playing three matching cat cards.',
    bonusXp: 300,
  },
  {
    id: 'steal-master',
    emoji: '🥷',
    title: 'Card Thief',
    description: 'Win a game after stealing a card from an opponent.',
    bonusXp: 225,
  },
  {
    id: 'skip-win',
    emoji: '⏭️',
    title: 'Turn Skipper',
    description: 'Win a game after playing a Skip card.',
    bonusXp: 200,
  },
];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Deterministic pseudo-random from a seed
function seededRandom(seed: number): number {
  const s = ((seed * 1664525 + 1013904223) & 0x7fffffff) >>> 0;
  return s / 0x7fffffff;
}

export function getTodayChallenge(): DailyChallenge {
  const dateStr = getTodayString();
  // Build a numeric seed from the date string
  const dateSeed = dateStr.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
  const idx = Math.floor(seededRandom(dateSeed) * CHALLENGES.length);
  return CHALLENGES[idx];
}

export function getChallengeCompletion(): ChallengeCompletion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHALLENGE_KEY);
    if (!raw) return null;
    const comp = JSON.parse(raw) as ChallengeCompletion;
    if (comp.date !== getTodayString()) return null;
    return comp;
  } catch {
    return null;
  }
}

export function isChallengeCompletedToday(): boolean {
  return getChallengeCompletion() !== null;
}

export function completeTodayChallenge(challengeId: string): ChallengeCompletion {
  const comp: ChallengeCompletion = {
    date: getTodayString(),
    challengeId,
    completedAt: Date.now(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(comp));
  }
  return comp;
}

/** Check whether the daily challenge condition was met given the finished game state. */
export function checkChallengeCondition(
  challenge: DailyChallenge,
  game: GameState,
  playerId: string
): boolean {
  const playerLogs = game.logs.filter(log => log.playerId === playerId);

  switch (challenge.id) {
    case 'attack-winner':
      return playerLogs.some(log => log.message.includes('played Attack!'));
    case 'nope-master':
      return playerLogs.some(log => log.message.includes('played Nope!'));
    case 'shuffle-win':
      return playerLogs.some(log => log.message.includes('shuffled the deck!'));
    case 'defuse-hero':
      return playerLogs.some(log => log.message.includes('defused the Exploding Kitten'));
    case 'favor-winner':
      return playerLogs.some(
        log => log.message.includes('asked') && log.message.includes('for a Favor!')
      );
    case 'cat-combo-win':
      return playerLogs.some(log => log.message.includes('played a pair of'));
    case 'see-future-win':
      return playerLogs.some(log => log.message.includes('is seeing the future'));
    case 'triple-cat-win':
      return playerLogs.some(log => log.message.includes('played three'));
    case 'steal-master':
      return playerLogs.some(log => log.message.includes('stole a card from'));
    case 'skip-win':
      return playerLogs.some(log => log.message.includes('played Skip!'));
    default:
      return false;
  }
}
