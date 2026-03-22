'use client';

import { motion, AnimatePresence } from 'framer-motion';

function HotkeyItem({ keyLabel, description }: { keyLabel: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg lg:rounded-xl border border-border bg-surface-light/70 lg:bg-black/30 px-3 py-2 lg:px-4 lg:py-3 shadow-inner">
      <span className="text-xs lg:text-sm font-black px-2 py-0.5 lg:px-3 lg:py-1 rounded-md bg-surface border border-border">{keyLabel}</span>
      <span className="text-text-muted text-xs lg:text-sm font-medium">{description}</span>
    </div>
  );
}

interface Props {
  show: boolean;
  onClose: () => void;
}

export default function HotkeysModal({ show, onClose }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="glass-panel rounded-3xl p-5 max-w-sm w-full border border-border"
          >
            <p className="display-font text-xl text-warning mb-3">Speed Controls</p>
            <div className="space-y-2 text-sm">
              <HotkeyItem keyLabel="D" description="Draw card" />
              <HotkeyItem keyLabel="Enter / P" description="Play selected cards" />
              <HotkeyItem keyLabel="L" description="Toggle game log" />
              <HotkeyItem keyLabel="?" description="Toggle this shortcut sheet" />
              <HotkeyItem keyLabel="Esc" description="Clear selections / close overlays" />
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 py-2.5 rounded-xl bg-surface-light border border-border hover:border-accent text-text font-bold"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
