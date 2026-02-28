'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOTES = ['😂', '😱', '🔥', '💀', '😈', '🙏', '👀', '💪'];

interface QuickEmotesProps {
  onEmote: (emote: string) => void;
}

export default function QuickEmotes({ onEmote }: QuickEmotesProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-lg bg-surface-light/85 border border-border flex items-center justify-center text-sm active:border-accent active:bg-surface-light transition-colors"
        title="Emotes"
        aria-label="Open emotes"
      >
        😄
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop to close emote picker on tap outside */}
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute bottom-full right-0 mb-2 bg-surface border border-border rounded-xl p-2 shadow-xl z-30"
            >
              <div className="grid grid-cols-4 gap-1.5">
                {EMOTES.map(emote => (
                  <motion.button
                    key={emote}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => {
                      onEmote(emote);
                      setOpen(false);
                    }}
                    className="w-11 h-11 rounded-lg active:bg-surface-light flex items-center justify-center text-xl transition-colors"
                  >
                    {emote}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Floating emote that appears above player
export function FloatingEmote({ emote, onDone }: { emote: string; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1.5, y: -40 }}
      exit={{ opacity: 0, y: -80, scale: 0.5 }}
      transition={{ duration: 1.5 }}
      onAnimationComplete={onDone}
      className="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl pointer-events-none z-50"
    >
      {emote}
    </motion.div>
  );
}
