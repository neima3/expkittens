'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

interface DrawPileProps {
  count: number;
  onClick: () => void;
  disabled?: boolean;
  isMyTurn: boolean;
  implodingKittenPosition?: number | null; // position from top (0 = next card)
}

export default memo(function DrawPile({ count, onClick, disabled, isMyTurn, implodingKittenPosition }: DrawPileProps) {
  // Calculate thickness based on count (max 10 pixels visually)
  const thickness = Math.min(Math.max(count / 3, 2), 12);
  const { theme } = useTheme();
  const accent = theme.variables['--color-accent'];
  const surface = theme.variables['--color-surface'];
  const surfaceLight = theme.variables['--color-surface-light'];

  return (
    <motion.button
      id="draw-pile-btn"
      whileTap={!disabled && isMyTurn ? { scale: 0.95, y: thickness } : undefined}
      whileHover={!disabled && isMyTurn ? { scale: 1.05 } : undefined}
      onClick={onClick}
      disabled={disabled || !isMyTurn}
      aria-label={`Draw pile, ${count} cards remaining${isMyTurn && !disabled ? '. Press to draw a card.' : ''}`}
      className={`relative w-24 h-[136px] md:w-28 md:h-40 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all
        ${isMyTurn && !disabled
          ? 'cursor-pointer hover:brightness-110 group card-shine'
          : 'cursor-default opacity-80'}
      `}
      style={{
        background: isMyTurn && !disabled
          ? `linear-gradient(145deg, ${surfaceLight} 0%, ${surface} 100%)`
          : `linear-gradient(145deg, ${surfaceLight} 0%, ${surface} 100%)`,
        borderColor: isMyTurn && !disabled ? accent : `${theme.cardBack.border}99`,
        boxShadow: isMyTurn && !disabled
          ? `0 ${thickness}px 0 ${accent}55, 0 ${thickness + 4}px 12px ${accent}33, 0 ${thickness + 12}px 24px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1), 0 0 30px ${accent}33`
          : `0 ${thickness}px 0 rgba(0,0,0,0.5), 0 ${thickness + 4}px 12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)`,
        transform: `translateY(-${thickness}px)`,
      }}
    >
      {/* Glow pulse for active state */}
      {isMyTurn && !disabled && (
        <>
          <div className="absolute inset-0 rounded-2xl bg-accent/20 animate-pulse-glow opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-accent/50"
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </>
      )}

      {/* Decorative texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 12 12\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M0 0h12v12H0V0zm6 6h6v6H6V6zM0 6h6v6H0V6zm6-6h6v6H6V0z\\' fill=\\'%23ffffff\\' fill-opacity=\\'0.02\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E')] pointer-events-none rounded-2xl mix-blend-overlay" />

      <motion.span
        className="text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
        animate={isMyTurn && !disabled ? { y: [0, -3, 0], rotate: [0, 2, -2, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >🎴</motion.span>
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

      {/* Imploding kitten face-up warning */}
      {implodingKittenPosition != null && (
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7], scale: [0.97, 1, 0.97] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
          style={{ background: 'rgba(123,47,190,0.9)', color: '#e9d5ff', boxShadow: '0 0 10px rgba(153,51,255,0.6)' }}
        >
          ☢️ IK in {implodingKittenPosition + 1}
        </motion.div>
      )}
    </motion.button>
  );
})
