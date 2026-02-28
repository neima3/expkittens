'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '@/types/game';
import { CARD_INFO } from '@/types/game';

interface DiscardPileProps {
  cards: Card[];
}

export default memo(function DiscardPile({ cards }: DiscardPileProps) {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const info = topCard ? CARD_INFO[topCard.type] : null;

  return (
    <div className="relative w-24 h-[136px] md:w-28 md:h-40 flex flex-col items-center justify-center">
      {/* Base slot */}
      <div className="absolute inset-0 rounded-2xl border-2 border-white/5 border-dashed bg-black/40 flex flex-col items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]">
        {!topCard && <span className="text-text-muted/50 text-xs font-bold uppercase tracking-wider">Discard</span>}
      </div>

      <AnimatePresence>
        {topCard && info && (
          <motion.div
            key={topCard.id + cards.length}
            initial={{ scale: 1.2, opacity: 0, rotate: -8, y: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: (cards.length % 5) - 2, y: 0 }}
            className="absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.6),0_2px_8px_var(--glow-color)] overflow-hidden"
            style={{
              background: `linear-gradient(145deg, ${info.color}33, ${info.color}11, #000)`,
              borderColor: `${info.color}88`,
              '--glow-color': `${info.color}44`
            } as any}
          >
            {/* Inner dynamic lighting */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            
            <span className="text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] z-10">{info.emoji}</span>
            <span className="text-[10px] font-black mt-2 px-1 text-center uppercase tracking-wider z-10 drop-shadow-md" style={{ color: info.color }}>
              {info.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute -bottom-7 bg-surface-light/60 border border-white/5 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
        <span className="text-[10px] font-bold text-text-muted/80 uppercase tracking-widest">
          {cards.length} <span className="opacity-60">in pile</span>
        </span>
      </div>
    </div>
  );
})
