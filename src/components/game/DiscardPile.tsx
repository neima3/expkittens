'use client';

import { memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardType } from '@/types/game';
import { CARD_INFO } from '@/types/game';

const LONG_PRESS_MS = 400;
const HOVER_DELAY_MS = 600;

interface DiscardPileProps {
  cards: Card[];
  onPreview?: (cardType: CardType) => void;
  onPreviewEnd?: () => void;
}

export default memo(function DiscardPile({ cards, onPreview, onPreviewEnd }: DiscardPileProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }, []);

  const handleTouchStart = useCallback((cardType: CardType) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onPreview?.(cardType);
    }, LONG_PRESS_MS);
  }, [onPreview]);

  const handleTouchEnd = useCallback(() => {
    clearTimers();
    if (isLongPress.current) {
      onPreviewEnd?.();
      isLongPress.current = false;
    }
  }, [clearTimers, onPreviewEnd]);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback((cardType: CardType) => {
    hoverTimer.current = setTimeout(() => {
      onPreview?.(cardType);
    }, HOVER_DELAY_MS);
  }, [onPreview]);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    onPreviewEnd?.();
  }, [clearTimers, onPreviewEnd]);
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const info = topCard ? CARD_INFO[topCard.type] : null;
  const prevCard = cards.length > 1 ? cards[cards.length - 2] : null;
  const prevInfo = prevCard ? CARD_INFO[prevCard.type] : null;

  return (
    <div className="relative w-24 h-[136px] md:w-28 md:h-40 flex flex-col items-center justify-center" aria-label={`Discard pile, ${cards.length} cards${topCard ? `. Top card: ${info?.name}` : ''}`}>
      {/* Base slot */}
      <div className="absolute inset-0 rounded-2xl border-2 border-white/5 border-dashed bg-black/40 flex flex-col items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]">
        {!topCard && <span className="text-text-muted/50 text-xs font-bold uppercase tracking-wider">Discard</span>}
      </div>

      {/* Previous card (stack effect) */}
      <AnimatePresence>
        {prevCard && prevInfo && (
          <motion.div
            key={`prev-${prevCard.id}`}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 0.95, opacity: 0.6, rotate: (cards.length % 7) - 3, x: -3, y: -3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(145deg, ${prevInfo.color}22, ${prevInfo.color}08, #000)`,
              borderColor: `${prevInfo.color}55`,
            }}
          >
            <span className="text-3xl opacity-50">{prevInfo.emoji}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top card */}
      <AnimatePresence>
        {topCard && info && (
          <motion.div
            key={topCard.id + cards.length}
            initial={{ scale: 1.2, opacity: 0, rotate: -8, y: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: (cards.length % 5) - 2, y: 0 }}
            onTouchStart={() => handleTouchStart(topCard.type)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onMouseEnter={() => handleMouseEnter(topCard.type)}
            onMouseLeave={handleMouseLeave}
            className="absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.6),0_2px_8px_var(--glow-color)] overflow-hidden card-shine cursor-pointer"
            style={{
              background: `linear-gradient(145deg, ${info.color}33, ${info.color}11, #000)`,
              borderColor: `${info.color}88`,
              '--glow-color': `${info.color}44`
            } as any}
          >
            {/* Inner dynamic lighting */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            
            {/* Animated glow ring */}
            <motion.div
              className="absolute inset-2 rounded-xl border border-white/20"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            <motion.span 
              className="text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] z-10"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {info.emoji}
            </motion.span>
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
