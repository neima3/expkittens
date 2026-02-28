'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

interface DrawPileProps {
  count: number;
  onClick: () => void;
  disabled?: boolean;
  isMyTurn: boolean;
}

export default memo(function DrawPile({ count, onClick, disabled, isMyTurn }: DrawPileProps) {
  return (
    <motion.button
      id="draw-pile-btn"
      whileTap={!disabled && isMyTurn ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled || !isMyTurn}
      className={`relative w-24 h-[136px] md:w-28 md:h-40 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all shadow-xl
        ${isMyTurn && !disabled
          ? 'border-accent bg-accent/12 animate-pulse-glow cursor-pointer hover:bg-accent/22'
          : 'border-border bg-surface-light/85 cursor-default opacity-70'}
      `}
    >
      {/* Stacked card effect */}
      <div className="absolute -top-1 -left-1 w-full h-full rounded-2xl bg-[#2d214b] border border-[#56457d] -z-10" />
      <div className="absolute -top-2 -left-2 w-full h-full rounded-2xl bg-[#1b1530] border border-[#423167] -z-20" />

      <span className="text-4xl">🎴</span>
      <span className="text-sm font-bold text-text-muted">{count} cards</span>
      {isMyTurn && !disabled && (
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs text-accent font-bold mt-1"
        >
          TAP TO DRAW
        </motion.span>
      )}
    </motion.button>
  );
})
