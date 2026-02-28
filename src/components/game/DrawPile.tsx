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
  // Calculate thickness based on count (max 10 pixels visually)
  const thickness = Math.min(Math.max(count / 3, 2), 12);
  
  return (
    <motion.button
      id="draw-pile-btn"
      whileTap={!disabled && isMyTurn ? { scale: 0.95, y: thickness } : undefined}
      onClick={onClick}
      disabled={disabled || !isMyTurn}
      className={`relative w-24 h-[136px] md:w-28 md:h-40 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all
        ${isMyTurn && !disabled
          ? 'border-accent bg-[linear-gradient(145deg,#2a1525_0%,#1a0d1a_100%)] cursor-pointer hover:brightness-110 group'
          : 'border-border/60 bg-[linear-gradient(145deg,#1f183b_0%,#0d0a1b_100%)] cursor-default opacity-80'}
      `}
      style={{
        boxShadow: isMyTurn && !disabled
          ? `0 ${thickness}px 0 #5a2035, 0 ${thickness + 4}px 12px rgba(255,95,46,0.3), 0 ${thickness + 12}px 24px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)`
          : `0 ${thickness}px 0 #18122b, 0 ${thickness + 4}px 12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)`,
        transform: `translateY(-${thickness}px)`
      }}
    >
      {/* Glow pulse for active state */}
      {isMyTurn && !disabled && (
        <div className="absolute inset-0 rounded-2xl bg-accent/20 animate-pulse-glow opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Decorative texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 12 12\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M0 0h12v12H0V0zm6 6h6v6H6V6zM0 6h6v6H0V6zm6-6h6v6H6V0z\\' fill=\\'%23ffffff\\' fill-opacity=\\'0.02\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E')] pointer-events-none rounded-2xl mix-blend-overlay" />

      <span className="text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">🎴</span>
      <span className="text-[11px] font-black text-white/90 tracking-wide uppercase drop-shadow-md z-10">{count} cards</span>
      
      {isMyTurn && !disabled && (
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-[10px] text-accent font-black mt-2 tracking-widest z-10"
        >
          DRAW
        </motion.span>
      )}
    </motion.button>
  );
})
