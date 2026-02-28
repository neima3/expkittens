'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '@/types/game';
import GameCard from './GameCard';

interface PlayerHandProps {
  cards: Card[];
  selectedCards: string[];
  onCardClick: (card: Card) => void;
  disabled?: boolean;
}

export default function PlayerHand({ cards, selectedCards, onCardClick, disabled }: PlayerHandProps) {
  const sorted = [...cards].sort((a, b) => a.type.localeCompare(b.type));
  const total = sorted.length;

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 px-2 bg-gradient-to-t from-[#0a0714] to-transparent scroll-touch">
      <div className="flex gap-[-8px] md:gap-[-4px] justify-center min-w-max px-6 pb-2" style={{ perspective: '800px' }}>
        <AnimatePresence mode="popLayout">
          {sorted.map((card, i) => {
            // Calculate fan rotation
            const middle = (total - 1) / 2;
            const offset = i - middle;
            const rotation = offset * 3; // 3 degrees per card from center
            const yOffset = Math.abs(offset) * 2; // Slight arc

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 50, rotate: 0 }}
                animate={{ 
                  opacity: 1, 
                  y: selectedCards.includes(card.id) ? -16 : yOffset, 
                  rotate: selectedCards.includes(card.id) ? 0 : rotation,
                  zIndex: selectedCards.includes(card.id) ? 50 : i
                }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                whileHover={{ y: -12, zIndex: 40, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="-mx-1 sm:-mx-2"
                style={{ transformOrigin: 'bottom center' }}
              >
                <GameCard
                  card={card}
                  selected={selectedCards.includes(card.id)}
                  onClick={() => onCardClick(card)}
                  disabled={disabled}
                  size="md"
                  index={i}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
