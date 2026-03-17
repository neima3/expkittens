'use client';

import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardType } from '@/types/game';
import GameCard from './GameCard';

const LONG_PRESS_MS = 400;
const HOVER_DELAY_MS = 600;

interface PlayerHandProps {
  cards: Card[];
  selectedCards: string[];
  onCardClick: (card: Card) => void;
  disabled?: boolean;
  onPreview?: (cardType: CardType) => void;
  onPreviewEnd?: () => void;
}

export default function PlayerHand({ cards, selectedCards, onCardClick, disabled, onPreview, onPreviewEnd }: PlayerHandProps) {
  const sorted = [...cards].sort((a, b) => a.type.localeCompare(b.type));
  const total = sorted.length;
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

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 px-2 bg-gradient-to-t from-[#0a0714] to-transparent scroll-touch lg:bg-transparent lg:overflow-visible">
      <div className="flex justify-center min-w-max px-6 pb-2 lg:px-0 lg:pb-6" style={{ perspective: '1000px' }}>
        <AnimatePresence mode="popLayout">
          {sorted.map((card, i) => {
            // Calculate fan rotation
            const middle = (total - 1) / 2;
            const offset = i - middle;
            // More dramatic rotation on desktop, slightly tighter on mobile
            const rotation = offset * 3.5;
            const yOffset = Math.abs(offset) * 2.5;

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 50, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: selectedCards.includes(card.id) ? -24 : yOffset,
                  rotate: selectedCards.includes(card.id) ? 0 : rotation,
                  zIndex: selectedCards.includes(card.id) ? 50 : i
                }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                whileHover={{ y: -16, zIndex: 40, rotate: 0, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="-mx-1 sm:-mx-1.5 lg:-mx-2"
                style={{ transformOrigin: 'bottom center' }}
                onTouchStart={() => handleTouchStart(card.type)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onMouseEnter={() => handleMouseEnter(card.type)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="lg:scale-[1.3] lg:transform-gpu lg:transform-origin-bottom">
                  <GameCard
                    card={card}
                    selected={selectedCards.includes(card.id)}
                    onClick={() => {
                      if (!isLongPress.current) onCardClick(card);
                    }}
                    disabled={disabled}
                    size="md"
                    index={i}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
