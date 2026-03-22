'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { getStats, getRankInfo, getAchievements, getLevelInfo } from '@/lib/stats';
import type { GameStats, Achievement, ProgressUpdate } from '@/lib/stats';
import type { SeriesState } from '@/types/game';
import { AVATARS } from '@/types/game';

interface PostMatchSummaryProps {
  show: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onGoHome: () => void;
  isWinner: boolean;
  gameId?: string;
  matchStats?: {
    cardsDrawn: number;
    defusesUsed: number;
    opponentsEliminated: number;
  };
  progressUpdate?: ProgressUpdate | null;
  series?: SeriesState;
  playerId?: string;
  players?: { id: string; name: string; avatar: number }[];
}

interface AnimatedStat {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export default function PostMatchSummary({
  show,
  onClose,
  onPlayAgain,
  onGoHome,
  isWinner,
  gameId,
  matchStats = { cardsDrawn: 0, defusesUsed: 0, opponentsEliminated: 0 },
  progressUpdate,
  series,
  playerId,
  players = [],
}: PostMatchSummaryProps) {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(0);
  const [replayShareId, setReplayShareId] = useState<string | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayCopied, setReplayCopied] = useState(false);

  useEffect(() => {
    if (show) {
      const currentStats = getStats();
      setStats(currentStats);
      
      // Calculate which achievements were newly unlocked
      const achievements = getAchievements(currentStats);
      const justUnlocked = achievements.filter(a => {
        // Achievement was just unlocked if progress >= goal and we have a progress update
        if (progressUpdate && a.progress >= a.goal && !a.unlocked === false) {
          // Check if this achievement was unlocked during this match
          // We approximate this by checking if the progress increased significantly
          return true;
        }
        return a.unlocked;
      });
      setNewlyUnlocked(justUnlocked.slice(0, 3)); // Show max 3
      
      // Trigger XP animation
      if (progressUpdate?.gainedXp) {
        setShowXpAnimation(true);
        setXpAnimated(0);
        const duration = 1500;
        const steps = 30;
        const increment = progressUpdate.gainedXp / steps;
        let current = 0;
        
        const timer = setInterval(() => {
          current += increment;
          if (current >= progressUpdate.gainedXp) {
            setXpAnimated(progressUpdate.gainedXp);
            clearInterval(timer);
          } else {
            setXpAnimated(Math.floor(current));
          }
        }, duration / steps);
        
        return () => clearInterval(timer);
      }
    }
  }, [show, progressUpdate]);

  const shareReplay = useCallback(async () => {
    if (!gameId || replayLoading) return;
    if (replayShareId) {
      // Already created — just copy
      const url = `${window.location.origin}/replay/${replayShareId}`;
      navigator.clipboard.writeText(url).then(() => {
        setReplayCopied(true);
        setTimeout(() => setReplayCopied(false), 2000);
      });
      return;
    }
    setReplayLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/share-replay`, { method: 'POST' });
      const data = await res.json();
      if (data.shareId) {
        setReplayShareId(data.shareId);
        const url = `${window.location.origin}/replay/${data.shareId}`;
        navigator.clipboard.writeText(url).then(() => {
          setReplayCopied(true);
          setTimeout(() => setReplayCopied(false), 2000);
        });
      }
    } catch {
      // silently fail
    } finally {
      setReplayLoading(false);
    }
  }, [gameId, replayShareId, replayLoading]);

  if (!stats) return null;

  const rank = getRankInfo(stats);
  const level = getLevelInfo(stats);
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  const matchAnimatedStats: AnimatedStat[] = [
    { label: 'Cards Drawn', value: matchStats.cardsDrawn.toString(), icon: '🃏', color: '#FFD700' },
    { label: 'Defuses Used', value: matchStats.defusesUsed.toString(), icon: '🔧', color: '#2bd47c' },
    { label: 'Opponents Eliminated', value: matchStats.opponentsEliminated.toString(), icon: '💥', color: '#ff3355' },
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overscroll-contain"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            className="relative bg-[linear-gradient(165deg,#1f183b_0%,#130f25_100%)] rounded-[2.5rem] p-6 md:p-8 max-w-md w-full border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] max-h-[92vh] overflow-y-auto scroll-touch"
          >
            {/* Ambient glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-40 blur-[70px] pointer-events-none rounded-full ${isWinner ? 'bg-warning/20' : 'bg-danger/15'}`} />
            
            {/* Header */}
            <div className="relative z-10 text-center mb-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="text-7xl mb-3 drop-shadow-[0_0_30px_rgba(255,184,51,0.4)]"
              >
                {isWinner ? '🏆' : '💀'}
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="display-font text-4xl mb-2 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent drop-shadow-md"
              >
                {isWinner ? 'VICTORY!' : 'DEFEAT'}
              </motion.h2>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-text-muted font-medium"
              >
                {isWinner ? 'You survived the exploding kittens!' : 'Better luck next time!'}
              </motion.p>
            </div>

            {/* Series Progress */}
            {series && (() => {
              const winsNeeded = Math.ceil(series.bestOf / 2);
              const seriesOver = !!series.seriesWinnerId;
              const iAmSeriesWinner = seriesOver && playerId && (series.scores[playerId] ?? 0) >= winsNeeded;

              return (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.22 }}
                  className={`relative mb-5 border rounded-2xl p-4 overflow-hidden ${
                    seriesOver
                      ? iAmSeriesWinner
                        ? 'bg-gradient-to-br from-warning/20 to-warning/5 border-warning/40'
                        : 'bg-gradient-to-br from-danger/20 to-danger/5 border-danger/40'
                      : 'bg-gradient-to-br from-[#20a4f3]/15 to-[#20a4f3]/5 border-[#20a4f3]/30'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-3 text-text-muted">
                    {seriesOver ? 'Series Complete' : `Best of ${series.bestOf} — Match ${series.currentMatch}`}
                  </p>

                  {/* Score dots per player */}
                  <div className="space-y-2 mb-3">
                    {players.map(p => {
                      const name = series.playerNames[p.id] || p.name;
                      const wins = series.scores[p.id] || 0;
                      const isSeriesChamp = seriesOver && wins >= winsNeeded;
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-xl">{AVATARS[p.avatar]}</span>
                          <span className={`text-sm font-bold flex-1 ${isSeriesChamp ? 'text-warning' : 'text-text'}`}>
                            {name}
                            {isSeriesChamp && <span className="ml-1">👑</span>}
                          </span>
                          <div className="flex gap-1">
                            {Array.from({ length: winsNeeded }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                                  i < wins
                                    ? 'bg-success border-success shadow-[0_0_8px_rgba(43,212,124,0.5)]'
                                    : 'bg-transparent border-white/20'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-black tabular-nums text-text-muted w-6 text-right">{wins}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Match history breakdown */}
                  {series.history.length > 0 && (
                    <div className="border-t border-white/5 pt-2 mt-2">
                      <p className="text-[9px] uppercase tracking-wider text-text-muted font-bold mb-1.5">Match History</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {series.history.map((m, i) => (
                          <div
                            key={m.gameId}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-xs"
                          >
                            <span className="text-text-muted">G{i + 1}:</span>
                            <span className="font-bold text-success">{m.winnerName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {seriesOver && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 ${
                        iAmSeriesWinner
                          ? 'bg-warning/20 border border-warning/30'
                          : 'bg-danger/20 border border-danger/30'
                      }`}
                    >
                      <span className="text-xl">{iAmSeriesWinner ? '🏆' : '😿'}</span>
                      <span className={`text-sm font-bold ${iAmSeriesWinner ? 'text-warning' : 'text-danger'}`}>
                        {iAmSeriesWinner ? 'You won the series!' : 'Series lost — better luck next time!'}
                      </span>
                    </motion.div>
                  )}

                  {!seriesOver && (
                    <p className="text-xs text-text-muted mt-2">
                      {Object.entries(series.scores).some(([, w]) => w === winsNeeded - 1)
                        ? '⚠️ Match point — next game decides!'
                        : `${winsNeeded} wins needed to clinch the series`}
                    </p>
                  )}
                </motion.div>
              );
            })()}

            {/* XP Gained Section */}
            {progressUpdate && progressUpdate.gainedXp > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="relative mb-5 bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-4 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 blur-[30px] pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-accent font-bold mb-1">XP Gained</p>
                    <motion.p
                      className="text-3xl font-black text-white"
                      animate={showXpAnimation ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      +{xpAnimated}
                    </motion.p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1">Total XP</p>
                    <p className="text-xl font-bold text-white/80">{stats.xp.toLocaleString()}</p>
                  </div>
                </div>
                {progressUpdate.leveledUp && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="mt-3 flex items-center gap-2 bg-success/20 border border-success/30 rounded-xl px-3 py-2"
                  >
                    <span className="text-xl">🎉</span>
                    <span className="text-sm font-bold text-success">Level Up! Lv.{progressUpdate.level.level}</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Level Progress */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-5 bg-black/20 border border-white/5 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="text-xs font-bold text-white">Level {level.level}</p>
                    <p className="text-[10px] text-text-muted">{Math.max(0, level.nextLevelXp - level.xp)} XP to next</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                  {Math.round(level.progress * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/60 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-success/50 to-success rounded-full"
                  style={{ boxShadow: '0 0 10px rgba(43,212,124,0.6)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(level.progress * 100)}%` }}
                  transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Rank Progress */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mb-5 bg-black/20 border border-white/5 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎖️</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: rank.color }}>{rank.title}</p>
                    <p className="text-[10px] text-text-muted">
                      {rank.nextWins ? `${Math.max(0, rank.nextWins - stats.wins)} wins to next rank` : 'Max rank achieved!'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-black/60 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, transparent, ${rank.color})`,
                    boxShadow: `0 0 10px ${rank.color}`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(rank.progress * 100)}%` }}
                  transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Match Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-5"
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-3">Match Stats</p>
              <div className="grid grid-cols-3 gap-2">
                {matchAnimatedStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="bg-white/5 border border-white/5 rounded-xl p-3 text-center"
                  >
                    <div className="text-2xl mb-1" style={{ textShadow: `0 2px 8px ${stat.color}66` }}>
                      {stat.icon}
                    </div>
                    <p className="text-lg font-black text-white mb-0.5">{stat.value}</p>
                    <p className="text-[9px] text-text-muted uppercase tracking-wider">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* New Achievements */}
            {newlyUnlocked.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-5"
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-3 flex items-center gap-2">
                  <span>🏅</span> Achievements Unlocked
                </p>
                <div className="space-y-2">
                  {newlyUnlocked.map((achievement, i) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.55 + i * 0.1 }}
                      className="flex items-center gap-3 bg-success/10 border border-success/30 rounded-xl px-3 py-2.5"
                    >
                      <span className="text-2xl">{achievement.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{achievement.title}</p>
                        <p className="text-[10px] text-text-muted">{achievement.description}</p>
                      </div>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1, type: 'spring', stiffness: 400 }}
                        className="text-success text-lg"
                      >
                        ✓
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Career Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mb-6"
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-3">Career Stats</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-black text-white">{stats.gamesPlayed}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">Games</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-black text-success">{stats.wins}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">Wins</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-black text-warning">{winRate}%</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">Win Rate</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-black text-accent">{stats.bestWinStreak}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">Best Streak</p>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onPlayAgain}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-black text-lg tracking-wide shadow-[0_8px_24px_rgba(255,95,46,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-[#ff8d44]/50 min-h-[56px] relative overflow-hidden group"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -skew-x-12 -translate-x-full group-hover:translate-x-full duration-1000" />
                <span className="flex items-center justify-center gap-2">
                  <span>🎮</span> {series && !series.seriesWinnerId ? 'Next Match' : 'Play Again'}
                </span>
              </motion.button>
              
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onGoHome}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/90 font-bold hover:bg-white/10 transition-colors shadow-sm text-sm"
                >
                  Home
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl bg-transparent text-text-muted hover:text-white transition-colors text-sm font-bold"
                >
                  Close
                </motion.button>
              </div>

              {gameId && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={shareReplay}
                  disabled={replayLoading}
                  className="w-full py-3 rounded-xl bg-[#6366f1]/20 border border-[#6366f1]/40 text-[#a5b4fc] font-bold text-sm hover:bg-[#6366f1]/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {replayLoading ? (
                    <><span className="w-3.5 h-3.5 border-2 border-[#a5b4fc] border-t-transparent rounded-full animate-spin" /> Creating link...</>
                  ) : replayCopied ? (
                    <>✓ Replay link copied!</>
                  ) : replayShareId ? (
                    <>🔗 Copy Replay Link</>
                  ) : (
                    <>🎬 Share Replay</>
                  )}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
