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
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative bg-[linear-gradient(165deg,#1f183b_0%,#130f25_100%)] rounded-[2rem] p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] max-h-[90vh] overflow-y-auto scroll-touch overscroll-contain overflow-hidden"
          >
            {/* Ambient background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-accent/20 blur-[60px] pointer-events-none rounded-full" />

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="display-font text-3xl bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent drop-shadow-sm">
                  Player Card
                </h3>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-warning/10 blur-[20px] pointer-events-none" />
                  <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1">Current Rank</p>
                  <p className="text-xl font-black mb-3" style={{ color: rank.color, textShadow: `0 2px 8px ${rank.color}66` }}>{rank.title}</p>
                  <div className="h-1.5 rounded-full bg-black/60 overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, transparent, ${rank.color})`, boxShadow: `0 0 10px ${rank.color}` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(rank.progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-text-muted/70 uppercase tracking-widest mt-2">
                    {rank.nextWins ? `${Math.max(0, rank.nextWins - stats.wins)} WINS TO NEXT` : 'MAX RANK'}
                  </p>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-success/10 blur-[20px] pointer-events-none" />
                  <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1">Level</p>
                  <p className="text-xl font-black mb-3 text-success drop-shadow-[0_2px_8px_rgba(43,212,124,0.4)]">Lv.{level.level}</p>
                  <div className="h-1.5 rounded-full bg-black/60 overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-success/50 to-success"
                      style={{ boxShadow: '0 0 10px rgba(43,212,124,0.8)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(level.progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-text-muted/70 uppercase tracking-widest mt-2">
                    {Math.max(0, level.nextLevelXp - level.xp)} XP TO NEXT
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                <StatBox label="Win Rate" value={`${winRate}%`} color={winRate >= 50 ? '#2bd47c' : '#ffb833'} />
                <StatBox label="Played" value={stats.gamesPlayed} />
                <StatBox label="Wins" value={stats.wins} color="#2bd47c" />
                <StatBox label="Streak" value={stats.winStreak} emoji="🔥" color="#ff5f2e" />
                <StatBox label="Best Streak" value={stats.bestWinStreak} emoji="🏆" />
                <StatBox label="Explosions" value={stats.explosions} emoji="💥" color="#ff3355" />
                <StatBox label="Cards" value={stats.cardsPlayed} emoji="🃏" />
                <StatBox label="Stolen" value={stats.cardsStolen} emoji="🥷" />
              </div>

              <div className="bg-black/20 border border-white/5 rounded-2xl p-4 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/80 font-black">Achievements</p>
                  <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{unlocked.length}/{achievements.length}</span>
                </div>
                
                {nextAchievement && (
                  <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl drop-shadow-md">{nextAchievement.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-white">{nextAchievement.title}</span>
                        <span className="text-[9px] text-text-muted">{nextAchievement.progress}/{nextAchievement.goal}</span>
                      </div>
                      <div className="h-1 rounded-full bg-black/60 overflow-hidden">
                        <motion.div 
                          className="h-full bg-accent rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(nextAchievement.progress / nextAchievement.goal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {achievements.map(a => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border font-bold transition-colors ${
                        a.unlocked
                          ? 'border-success/30 text-success bg-success/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                          : 'border-white/5 text-text-muted/50 bg-black/40'
                      }`}
                      title={a.description}
                    >
                      <span className={a.unlocked ? 'opacity-100' : 'opacity-40 grayscale'}>{a.emoji}</span>
                      <span className="tracking-wide">{a.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
      {color && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
          style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }}
        />
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        {emoji && <span className="text-sm drop-shadow-md">{emoji}</span>}
        <p className="text-xl font-black" style={color ? { color, textShadow: `0 2px 8px ${color}66` } : { textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {value}
        </p>
      </div>
      <p className="text-[9px] text-text-muted/80 uppercase tracking-widest font-bold">{label}</p>
    </div>
  );
}
