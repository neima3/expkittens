'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getStats, getRankInfo, getAchievements, getLevelInfo } from '@/lib/stats';
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
  const rank = getRankInfo(stats);
  const level = getLevelInfo(stats);
  const achievements = getAchievements(stats);
  const unlocked = achievements.filter(a => a.unlocked);
  const nextAchievement = achievements.find(a => !a.unlocked);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overscroll-contain"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            onClick={e => e.stopPropagation()}
            className="glass-panel rounded-3xl p-5 md:p-6 max-w-sm w-full border-2 border-accent max-h-[90vh] overflow-y-auto scroll-touch overscroll-contain"
          >
            <h3 className="display-font text-2xl mb-4 text-center bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent">
              Your Stats
            </h3>

            <div className="bg-surface-light/80 border border-border rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-[0.08em] text-text-muted font-bold">Rank</p>
                <p className="text-sm font-bold" style={{ color: rank.color }}>{rank.title}</p>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: rank.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(rank.progress * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-text-muted">
                {rank.nextWins
                  ? `${Math.max(0, rank.nextWins - stats.wins)} wins to next rank`
                  : 'Max rank reached'}
              </p>
            </div>

            <div className="bg-surface-light/80 border border-border rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-[0.08em] text-text-muted font-bold">Level</p>
                <p className="text-sm font-bold text-success">Lv.{level.level}</p>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-success to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-text-muted">
                {Math.max(0, level.nextLevelXp - level.xp)} XP to next level
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatBox label="Games Played" value={stats.gamesPlayed} />
              <StatBox label="Win Rate" value={`${winRate}%`} color={winRate > 50 ? '#44bb44' : '#ff8800'} />
              <StatBox label="Wins" value={stats.wins} color="#44bb44" />
              <StatBox label="Losses" value={stats.losses} color="#ff4444" />
              <StatBox label="Explosions" value={stats.explosions} emoji="💥" />
              <StatBox label="Cards Played" value={stats.cardsPlayed} emoji="🃏" />
              <StatBox label="Cards Stolen" value={stats.cardsStolen} emoji="🥷" />
              <StatBox label="Defuses Used" value={stats.defusesUsed} emoji="🔧" />
              <StatBox label="Win Streak" value={stats.winStreak} emoji="🔥" />
              <StatBox label="Best Streak" value={stats.bestWinStreak} emoji="🏆" />
            </div>

            <div className="bg-surface-light/75 border border-border rounded-xl p-3 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-[0.08em] text-text-muted font-bold">Achievements</p>
                <p className="text-xs text-text-muted">{unlocked.length}/{achievements.length} unlocked</p>
              </div>
              {nextAchievement ? (
                <p className="text-xs text-text-muted mb-2">
                  Next: <span className="text-text font-semibold">{nextAchievement.emoji} {nextAchievement.title}</span>
                  {' '}({nextAchievement.progress}/{nextAchievement.goal})
                </p>
              ) : (
                <p className="text-xs text-success mb-2">All achievements unlocked.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {achievements.map(a => (
                  <span
                    key={a.id}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      a.unlocked
                        ? 'border-success/40 text-success bg-success/10'
                        : 'border-border text-text-muted bg-surface/60'
                    }`}
                    title={a.description}
                  >
                    {a.emoji} {a.title}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-surface-light border border-border text-text font-bold active:border-accent transition-colors min-h-[44px]"
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
    <div className="bg-surface-light/80 rounded-xl p-3 text-center border border-border">
      {emoji && <span className="text-lg">{emoji}</span>}
      <p className="text-2xl font-black" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
