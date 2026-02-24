'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '@/types/game';
import { CARD_INFO } from '@/types/game';

interface DiscardPileProps {
  cards: Card[];
}

export default function DiscardPile({ cards }: DiscardPileProps) {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const info = topCard ? CARD_INFO[topCard.type] : null;

  return (
    <div className="relative w-24 h-34 md:w-28 md:h-40 rounded-2xl border-2 border-border border-dashed flex flex-col items-center justify-center">
      <AnimatePresence>
        {topCard && info ? (
          <motion.div
            key={topCard.id + cards.length}
            initial={{ scale: 1.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${info.color}22, ${info.color}44)`,
              borderColor: `${info.color}66`,
            }}
          >
            <span className="text-3xl">{info.emoji}</span>
            <span className="text-[10px] font-bold mt-1" style={{ color: info.color }}>
              {info.name}
            </span>
          </motion.div>
        ) : (
          <span className="text-text-muted text-xs">Discard</span>
        )}
      </AnimatePresence>
      <span className="absolute -bottom-5 text-xs text-text-muted">
        {cards.length} discarded
      </span>
    </div>
  );
}
