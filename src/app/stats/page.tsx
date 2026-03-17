'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getStats, getRankInfo, getAchievements, getLevelInfo, getFavoriteCardType, resetStats } from '@/lib/stats';
import type { GameStats, GameResult } from '@/lib/stats';
import { CARD_INFO } from '@/types/game';
import type { CardType } from '@/types/game';

export default function StatsPage() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setStats(getStats());
  }, []);

  if (!stats) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <StatsDashboard stats={stats} showResetConfirm={showResetConfirm} setShowResetConfirm={setShowResetConfirm} onReset={() => { resetStats(); setStats(getStats()); setShowResetConfirm(false); }} />;
}

function StatsDashboard({ stats, showResetConfirm, setShowResetConfirm, onReset }: {
  stats: GameStats;
  showResetConfirm: boolean;
  setShowResetConfirm: (v: boolean) => void;
  onReset: () => void;
}) {
  const rank = getRankInfo(stats);
  const level = getLevelInfo(stats);
  const achievements = getAchievements(stats);
  const unlocked = achievements.filter(a => a.unlocked);
  const favoriteCard = getFavoriteCardType(stats);
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const survivalRate = stats.gamesPlayed > 0 ? Math.round(((stats.gamesPlayed - stats.explosions) / stats.gamesPlayed) * 100) : 0;

  const favoriteCardInfo = useMemo(() => {
    if (!favoriteCard) return null;
    const info = CARD_INFO[favoriteCard.type as CardType];
    return info ? { ...info, count: favoriteCard.count } : null;
  }, [favoriteCard]);

  const winRateData = useMemo(() => computeWinRateOverTime(stats.gameHistory || []), [stats.gameHistory]);

  return (
    <div className="min-h-dvh p-4 md:p-8 lg:p-12 overflow-y-auto scroll-touch">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-text-muted hover:text-text transition-colors flex items-center gap-2 py-2 pr-4 min-h-[44px]">
            <span>←</span> <span className="hidden sm:inline">Back to Menu</span>
          </Link>
          <h1 className="display-font text-3xl md:text-4xl bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
            Player Stats
          </h1>
          <div className="w-20" />
        </div>

        {/* Rank & Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 blur-[30px] pointer-events-none" style={{ background: rank.color, opacity: 0.15 }} />
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1">Current Rank</p>
            <p className="text-2xl font-black mb-3" style={{ color: rank.color, textShadow: `0 2px 8px ${rank.color}66` }}>{rank.title}</p>
            <div className="h-2 rounded-full bg-black/60 overflow-hidden shadow-inner">
              <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${rank.color})`, boxShadow: `0 0 10px ${rank.color}` }} initial={{ width: 0 }} animate={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </div>
            <p className="text-[9px] text-text-muted/70 uppercase tracking-widest mt-2">
              {rank.nextWins ? `${Math.max(0, rank.nextWins - stats.wins)} wins to next` : 'MAX RANK'}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-success/15 blur-[30px] pointer-events-none" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1">Level</p>
            <p className="text-2xl font-black mb-3 text-success drop-shadow-[0_2px_8px_rgba(43,212,124,0.4)]">Lv.{level.level}</p>
            <div className="h-2 rounded-full bg-black/60 overflow-hidden shadow-inner">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-success/50 to-success" style={{ boxShadow: '0 0 10px rgba(43,212,124,0.8)' }} initial={{ width: 0 }} animate={{ width: `${Math.round(level.progress * 100)}%` }} />
            </div>
            <p className="text-[9px] text-text-muted/70 uppercase tracking-widest mt-2">
              {Math.max(0, level.nextLevelXp - level.xp)} XP to next
            </p>
          </div>
        </div>

        {/* Core Stats Grid */}
        <div className="glass-panel rounded-2xl p-5 mb-6">
          <h2 className="text-xs uppercase tracking-[0.15em] text-text-muted font-black mb-4">Performance</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <StatBox label="Games" value={stats.gamesPlayed} />
            <StatBox label="Wins" value={stats.wins} color="#2bd47c" />
            <StatBox label="Losses" value={stats.losses} color="#ff3355" />
            <StatBox label="Win Rate" value={`${winRate}%`} color={winRate >= 50 ? '#2bd47c' : '#ffb833'} />
            <StatBox label="Survival" value={`${survivalRate}%`} color={survivalRate >= 50 ? '#2bd47c' : '#ff3355'} />
            <StatBox label="Explosions" value={stats.explosions} emoji="💥" color="#ff3355" />
            <StatBox label="Defuses" value={stats.defusesUsed} emoji="🔧" color="#44BB44" />
            <StatBox label="Nopes" value={stats.nopesPlayed || 0} emoji="✋" color="#888" />
            <StatBox label="Attacks" value={stats.attacksPlayed || 0} emoji="⚔️" color="#FF8800" />
            <StatBox label="Cards Played" value={stats.cardsPlayed} emoji="🃏" />
            <StatBox label="Stolen" value={stats.cardsStolen} emoji="🥷" color="#AA44FF" />
          </div>
        </div>

        {/* Streaks + Favorite Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-[0.15em] text-text-muted font-black mb-4">Streaks</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <span className="text-sm font-bold text-text-muted">Current Streak</span>
                </div>
                <span className="text-2xl font-black text-accent" style={{ textShadow: '0 2px 8px rgba(255,95,46,0.4)' }}>{stats.winStreak}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <span className="text-sm font-bold text-text-muted">Best Streak</span>
                </div>
                <span className="text-2xl font-black text-warning" style={{ textShadow: '0 2px 8px rgba(255,184,51,0.4)' }}>{stats.bestWinStreak}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-[0.15em] text-text-muted font-black mb-4">Favorite Card</h2>
            {favoriteCardInfo ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl border border-white/10" style={{ background: `${favoriteCardInfo.color}20`, boxShadow: `0 4px 20px ${favoriteCardInfo.color}33` }}>
                  {favoriteCardInfo.emoji}
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: favoriteCardInfo.color }}>{favoriteCardInfo.name}</p>
                  <p className="text-sm text-text-muted">Played {favoriteCardInfo.count} times</p>
                </div>
              </div>
            ) : (
              <p className="text-text-muted text-sm">Play some games to see your favorite card!</p>
            )}
          </div>
        </div>

        {/* Win Rate Chart */}
        <div className="glass-panel rounded-2xl p-5 mb-6">
          <h2 className="text-xs uppercase tracking-[0.15em] text-text-muted font-black mb-4">Win Rate Over Time</h2>
          {winRateData.length > 1 ? (
            <WinRateChart data={winRateData} />
          ) : (
            <div className="h-32 flex items-center justify-center text-text-muted text-sm">
              Play more games to see your win rate trend
            </div>
          )}
        </div>

        {/* Card Type Breakdown */}
        {stats.cardTypeCounts && Object.keys(stats.cardTypeCounts).length > 0 && (
          <div className="glass-panel rounded-2xl p-5 mb-6">
            <h2 className="text-xs uppercase tracking-[0.15em] text-text-muted font-black mb-4">Cards Breakdown</h2>
            <CardTypeBreakdown counts={stats.cardTypeCounts} />
          </div>
        )}

        {/* Achievements */}
        <div className="glass-panel rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-[0.15em] text-text-muted font-black">Achievements</h2>
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{unlocked.length}/{achievements.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map(a => (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${a.unlocked ? 'border-success/30 bg-success/5' : 'border-white/5 bg-black/20'}`}>
                <span className={`text-2xl ${a.unlocked ? '' : 'opacity-40 grayscale'}`}>{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`text-sm font-bold truncate ${a.unlocked ? 'text-success' : 'text-text-muted/60'}`}>{a.title}</span>
                    <span className="text-[10px] text-text-muted ml-2 shrink-0">{a.progress}/{a.goal}</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/60 overflow-hidden">
                    <motion.div className={`h-full rounded-full ${a.unlocked ? 'bg-success' : 'bg-accent'}`} initial={{ width: 0 }} animate={{ width: `${(a.progress / a.goal) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-text-muted/60 mt-1">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <div className="text-center pb-8">
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} className="text-text-muted/50 hover:text-danger text-sm transition-colors py-2 px-4">
              Reset All Stats
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-xl px-5 py-3">
              <span className="text-sm text-danger font-bold">Delete all stats permanently?</span>
              <button onClick={onReset} className="px-4 py-1.5 rounded-lg bg-danger text-white text-sm font-bold hover:bg-danger/80 transition-colors">
                Yes, Reset
              </button>
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-1.5 rounded-lg bg-white/10 text-text text-sm font-bold hover:bg-white/20 transition-colors">
                Cancel
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, emoji }: { label: string; value: number | string; color?: string; emoji?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
      {color && (
        <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20" style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }} />
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        {emoji && <span className="text-sm drop-shadow-md">{emoji}</span>}
        <p className="text-xl font-black" style={color ? { color, textShadow: `0 2px 8px ${color}66` } : { textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{value}</p>
      </div>
      <p className="text-[9px] text-text-muted/80 uppercase tracking-widest font-bold">{label}</p>
    </div>
  );
}

function computeWinRateOverTime(history: GameResult[]): { game: number; rate: number }[] {
  if (!history || history.length === 0) return [];
  const points: { game: number; rate: number }[] = [];
  let wins = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i].won) wins++;
    points.push({ game: i + 1, rate: Math.round((wins / (i + 1)) * 100) });
  }
  return points;
}

function WinRateChart({ data }: { data: { game: number; rate: number }[] }) {
  const maxRate = Math.max(...data.map(d => d.rate), 100);
  const chartHeight = 120;
  const chartWidth = 100; // percentage-based

  // Create SVG path
  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
    const y = chartHeight - (d.rate / maxRate) * chartHeight;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const latestRate = data[data.length - 1]?.rate ?? 0;

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-[120px] flex flex-col justify-between text-[9px] text-text-muted/50 font-bold pr-2">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>

      <div className="ml-8">
        <svg viewBox={`0 0 100 ${chartHeight}`} className="w-full h-[120px]" preserveAspectRatio="none">
          {/* 50% line */}
          <line x1="0" y1={chartHeight / 2} x2="100" y2={chartHeight / 2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* Area fill */}
          <path d={areaD} fill="url(#winRateGradient)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#2bd47c" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />

          {/* Latest point */}
          {points.length > 0 && (
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="#2bd47c" stroke="#130f25" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          )}

          <defs>
            <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(43,212,124,0.3)" />
              <stop offset="100%" stopColor="rgba(43,212,124,0)" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis */}
        <div className="flex justify-between text-[9px] text-text-muted/50 font-bold mt-1">
          <span>Game 1</span>
          <span>Current: {latestRate}%</span>
          <span>Game {data.length}</span>
        </div>
      </div>
    </div>
  );
}

function CardTypeBreakdown({ counts }: { counts: Record<string, number> }) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-2">
      {sorted.map(([type, count]) => {
        const info = CARD_INFO[type as CardType];
        if (!info) return null;
        const pct = Math.round((count / max) * 100);
        return (
          <div key={type} className="flex items-center gap-3">
            <span className="text-lg w-8 text-center shrink-0">{info.emoji}</span>
            <span className="text-xs font-bold text-text-muted w-28 truncate shrink-0">{info.name}</span>
            <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: info.color, opacity: 0.8 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
            <span className="text-xs font-black text-text-muted w-8 text-right shrink-0">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
