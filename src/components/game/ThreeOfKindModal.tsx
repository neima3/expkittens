'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardType, Player } from '@/types/game';
import { CARD_INFO, ACTION_CARD_TYPES, CAT_CARD_TYPES } from '@/types/game';

const STEALABLE_TYPES: CardType[] = [
  'defuse',
  ...ACTION_CARD_TYPES.filter(t => t !== 'nope'),
  ...CAT_CARD_TYPES,
];

interface ThreeOfKindModalProps {
  show: boolean;
  targets: Player[];
  onSelect: (targetId: string, cardType: CardType) => void;
  onCancel: () => void;
}

export default function ThreeOfKindModal({ show, targets, onSelect, onCancel }: ThreeOfKindModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CardType | null>(null);

  function handleConfirm() {
    if (selectedTarget && selectedType) {
      onSelect(selectedTarget, selectedType);
      setSelectedTarget(null);
      setSelectedType(null);
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 overscroll-contain"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-surface rounded-3xl p-5 md:p-6 max-w-sm w-full border-2 border-warning max-h-[85vh] overflow-y-auto scroll-touch overscroll-contain"
          >
            <h3 className="text-xl font-bold mb-4 text-center">Three of a Kind!</h3>

            {/* Step 1: Pick target */}
            <p className="text-sm text-text-muted mb-2">1. Choose a player to steal from:</p>
            <div className="space-y-2 mb-4">
              {targets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTarget(t.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all min-h-[44px] ${
                    selectedTarget === t.id
                      ? 'bg-warning/20 border-2 border-warning'
                      : 'bg-surface-light border-2 border-transparent active:border-border'
                  }`}
                >
                  <span className="font-bold">{t.name}</span>
                  <span className="text-text-muted text-sm ml-2">({t.hand.length} cards)</span>
                </button>
              ))}
            </div>

            {/* Step 2: Pick card type */}
            <p className="text-sm text-text-muted mb-2">2. Name a card to steal:</p>
            <div className="grid grid-cols-2 gap-2 mb-6 max-h-[40vh] overflow-y-auto scroll-touch">
              {STEALABLE_TYPES.map(type => {
                const info = CARD_INFO[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-2.5 rounded-xl text-center text-sm transition-all min-h-[44px] ${
                      selectedType === type
                        ? 'border-2 border-warning'
                        : 'border-2 border-transparent bg-surface-light active:border-border'
                    }`}
                    style={selectedType === type ? { background: `${info.color}22` } : undefined}
                  >
                    <span className="text-lg">{info.emoji}</span>
                    <p className="text-xs font-bold mt-0.5" style={{ color: info.color }}>
                      {info.name}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl bg-surface-light text-text-muted font-bold min-h-[44px]"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={!selectedTarget || !selectedType}
                className="flex-1 py-3 rounded-xl bg-warning text-black font-bold disabled:opacity-30 min-h-[44px]"
              >
                Steal!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
