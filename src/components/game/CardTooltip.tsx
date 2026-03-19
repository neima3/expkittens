'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CardType } from '@/types/game';
import { CARD_INFO, CAT_CARD_TYPES } from '@/types/game';

// Short in-game tips shown in the tooltip (keeps it compact)
const QUICK_TIPS: Partial<Record<CardType, string>> = {
  attack: 'Stacks! Next player takes 2 turns (or more).',
  skip: 'Safe escape — no draw required.',
  favor: 'Target players with Defuse cards.',
  shuffle: 'Use when kitten is near the top.',
  see_the_future: 'Plan your next move — then act.',
  nope: 'Save it for Attacks & Favors.',
  defuse: 'Most valuable card — never discard lightly.',
  exploding_kitten: 'Defuse or you\'re out!',
  taco_cat: 'Pair 2 to steal random · 3 to name it.',
  rainbow_cat: 'Pair 2 to steal random · 3 to name it.',
  beard_cat: 'Pair 2 to steal random · 3 to name it.',
  cattermelon: 'Pair 2 to steal random · 3 to name it.',
  potato_cat: 'Pair 2 to steal random · 3 to name it.',
};

interface CardTooltipProps {
  cardType: CardType | null;
  show: boolean;
}

export default function CardTooltip({ cardType, show }: CardTooltipProps) {
  if (!cardType) return null;
  const info = CARD_INFO[cardType];
  const tip = QUICK_TIPS[cardType];
  const isCat = CAT_CARD_TYPES.includes(cardType);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 rounded-xl bg-surface border shadow-2xl z-30 min-w-[220px] max-w-[260px] text-center pointer-events-none"
          style={{
            borderColor: `${info.color}55`,
            background: `linear-gradient(135deg, ${info.color}10, rgba(19,15,37,0.98))`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 16px ${info.color}22`,
          }}
        >
          {/* Name */}
          <p className="font-black text-sm mb-0.5" style={{ color: info.color }}>
            {info.emoji} {info.name}
          </p>

          {/* Description */}
          <p className="text-xs text-text-muted leading-snug">{info.description}</p>

          {/* Quick tip */}
          {tip && !isCat && (
            <p className="text-[10px] mt-1.5 font-medium leading-snug" style={{ color: `${info.color}cc` }}>
              💡 {tip}
            </p>
          )}
          {isCat && (
            <p className="text-[10px] mt-1.5 font-medium text-warning/80 leading-snug">
              💡 {tip}
            </p>
          )}

          {/* Tooltip arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${info.color}55`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
