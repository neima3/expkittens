'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '@/types/game';
import GameCard from './GameCard';

interface Props {
  show: boolean;
  cards: Card[];
  onAck: () => void;
}

export default function SeeFutureModal({ show, cards, onAck }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 border-[#FF44AA]"
          >
            <p className="text-4xl mb-2">🔮</p>
            <h3 className="text-xl font-bold mb-1">The Future</h3>
            <p className="text-xs text-text-muted mb-4">Top of the deck (drawn first → last):</p>
            <div className="flex justify-center gap-3 mb-6">
              {cards.map((card, i) => (
                <div key={i} className="text-center">
                  <GameCard card={card} size="md" disabled index={i} />
                  <p className="text-xs text-text-muted mt-1">#{i + 1}</p>
                </div>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAck}
              className="w-full py-3 rounded-xl bg-[#FF44AA] text-white font-bold"
            >
              Got it!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
