'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CardType } from '@/types/game';
import { CARD_INFO } from '@/types/game';

interface CardTooltipProps {
  cardType: CardType | null;
  show: boolean;
}

export default function CardTooltip({ cardType, show }: CardTooltipProps) {
  if (!cardType) return null;
  const info = CARD_INFO[cardType];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-surface border border-border shadow-xl z-30 min-w-[200px] text-center pointer-events-none"
        >
          <p className="font-bold text-sm" style={{ color: info.color }}>
            {info.emoji} {info.name}
          </p>
          <p className="text-xs text-text-muted mt-1">{info.description}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
