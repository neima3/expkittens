'use client';

import { motion } from 'framer-motion';
import type { Card } from '@/types/game';
import { CAT_CARD_TYPES } from '@/types/game';

interface ComboCoachProps {
  hand: Card[];
  isMyTurn: boolean;
  hasPendingAction: boolean;
  selectingTarget: boolean;
  selectingThreeTarget: boolean;
  deckSize: number;
  alivePlayers: number;
}

function isCat(type: Card['type']) {
  return CAT_CARD_TYPES.includes(type);
}

function countByType(cards: Card[]) {
  const byType = new Map<string, number>();
  for (const card of cards) {
    byType.set(card.type, (byType.get(card.type) || 0) + 1);
  }
  return byType;
}

export default function ComboCoach({
  hand,
  isMyTurn,
  hasPendingAction,
  selectingTarget,
  selectingThreeTarget,
  deckSize,
  alivePlayers,
}: ComboCoachProps) {
  const grouped = countByType(hand);
  const catGroups = [...grouped.entries()].filter(([type]) => isCat(type as Card['type']));
  const pairCount = catGroups.reduce((sum, [, count]) => sum + Math.floor(count / 2), 0);
  const tripleCount = catGroups.reduce((sum, [, count]) => sum + Math.floor(count / 3), 0);

  const hasDefuse = grouped.has('defuse');
  const hasSeeFuture = grouped.has('see_the_future');
  const hasAttack = grouped.has('attack');
  const hasSkip = grouped.has('skip');
  const hasShuffle = grouped.has('shuffle');

  const expectedKittens = Math.max(0, alivePlayers - 1);
  const danger = deckSize > 0 ? expectedKittens / deckSize : 0;
  const dangerPct = Math.round(danger * 100);

  const tips: string[] = [];

  if (hasPendingAction || selectingTarget || selectingThreeTarget) {
    tips.push('Resolve the active prompt first.');
  } else if (!isMyTurn) {
    tips.push('Track who is low on cards and target them with Favor/pairs next turn.');
  } else {
    if (!hasDefuse && danger > 0.1) {
      tips.push('No Defuse in hand. Avoid risky draws if possible.');
    }
    if (hasSeeFuture && danger > 0.12) {
      tips.push('Play See the Future before drawing to reduce bomb risk.');
    }
    if ((hasAttack || hasSkip) && danger > 0.18) {
      tips.push('Attack/Skip can dodge a dangerous draw this turn.');
    }
    if (hasShuffle && danger > 0.25) {
      tips.push('Shuffle can break dangerous known top-deck sequences.');
    }
    if (tripleCount > 0) {
      tips.push('You have a triple combo ready. Call Defuse if an opponent is hoarding cards.');
    } else if (pairCount > 0) {
      tips.push('You can fire a pair combo for pressure and tempo.');
    }
  }

  if (tips.length === 0) {
    tips.push('Build toward pairs while keeping at least one defensive action card in reserve.');
  }

  const styleTone =
    danger > 0.32 ? 'border-danger/50 bg-danger/10 text-danger' :
      danger > 0.17 ? 'border-warning/50 bg-warning/10 text-warning' :
        'border-success/40 bg-success/10 text-success';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl rounded-2xl border border-border/90 bg-surface/70 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.09em] text-text-muted">
          Combo Coach
        </p>
        <div className={`text-[11px] font-bold px-2 py-1 rounded-full border ${styleTone}`}>
          Bomb Risk {dangerPct}%
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <StatPill label="Pairs" value={pairCount} />
        <StatPill label="Triples" value={tripleCount} />
        <StatPill label="Defuse" value={hasDefuse ? 'Yes' : 'No'} muted={!hasDefuse} />
        <StatPill label="Control" value={hasAttack || hasSkip || hasShuffle ? 'Ready' : 'Low'} muted={!(hasAttack || hasSkip || hasShuffle)} />
      </div>

      <p className="text-xs md:text-sm text-text-muted leading-relaxed">{tips[0]}</p>
    </motion.div>
  );
}

function StatPill({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${muted ? 'border-border text-text-muted' : 'border-border/80 text-text'}`}>
      <span className="opacity-75 mr-1">{label}</span>
      <span>{value}</span>
    </div>
  );
}
