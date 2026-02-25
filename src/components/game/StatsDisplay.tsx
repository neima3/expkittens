'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getStats } from '@/lib/stats';
import type { GameStats } from '@/lib/stats';
import { useState, useEffect } from 'react';

interface StatsDisplayProps {
  show: boolean;
  onClose: () => void;
}

export default function StatsDisplay({ show, onClose }: StatsDisplayProps) {
  const [stats, setStats] = useState<GameStats | null>(null);

  useEffect(() => {
    if (show) setStats(getStats());
  }, [show]);

  if (!stats) return null;

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-surface rounded-3xl p-6 max-w-sm w-full border-2 border-accent"
          >
            <h3 className="text-2xl font-black mb-6 text-center bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent">
              Your Stats
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatBox label="Games Played" value={stats.gamesPlayed} />
              <StatBox label="Win Rate" value={`${winRate}%`} color={winRate > 50 ? '#44bb44' : '#ff8800'} />
              <StatBox label="Wins" value={stats.wins} color="#44bb44" />
              <StatBox label="Losses" value={stats.losses} color="#ff4444" />
              <StatBox label="Explosions" value={stats.explosions} emoji="💥" />
              <StatBox label="Cards Played" value={stats.cardsPlayed} emoji="🃏" />
              <StatBox label="Win Streak" value={stats.winStreak} emoji="🔥" />
              <StatBox label="Best Streak" value={stats.bestWinStreak} emoji="🏆" />
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-surface-light border border-border text-text font-bold hover:border-accent transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatBox({
  label,
  value,
  color,
  emoji,
}: {
  label: string;
  value: number | string;
  color?: string;
  emoji?: string;
}) {
  return (
    <div className="bg-surface-light rounded-xl p-3 text-center border border-border">
      {emoji && <span className="text-lg">{emoji}</span>}
      <p className="text-2xl font-black" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
