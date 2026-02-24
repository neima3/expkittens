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

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-1.5 md:gap-2 justify-center min-w-min px-2">
        <AnimatePresence mode="popLayout">
          {sorted.map((card, i) => (
            <GameCard
              key={card.id}
              card={card}
              selected={selectedCards.includes(card.id)}
              onClick={() => onCardClick(card)}
              disabled={disabled}
              size="md"
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
