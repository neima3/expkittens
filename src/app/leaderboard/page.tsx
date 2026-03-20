'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/app/api/leaderboard/route';

interface LeaderboardData {
  weekStart: string;
  entries: LeaderboardEntry[];
}

const RANK_STYLES: Record<number, { bg: string; text: string; emoji: string }> = {
  1: { bg: 'bg-warning/15 border-warning/40', text: 'text-warning', emoji: '🥇' },
  2: { bg: 'bg-white/10 border-white/20', text: 'text-white/80', emoji: '🥈' },
  3: { bg: 'bg-accent/10 border-accent/20', text: 'text-accent/80', emoji: '🥉' },
};

function formatWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((d: LeaderboardData) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load leaderboard'); setLoading(false); });
  }, []);

  return (
    <div className="min-h-dvh p-4 md:p-8 lg:p-12 overflow-y-auto scroll-touch">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/stats" className="text-text-muted hover:text-text transition-colors flex items-center gap-2 py-2 pr-4 min-h-[44px]">
            <span>←</span> <span className="hidden sm:inline">Back to Stats</span>
          </Link>
          <h1 className="display-font text-3xl md:text-4xl bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
            Weekly Leaderboard
          </h1>
          <div className="w-24" />
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="glass-panel rounded-2xl p-8 text-center text-danger">{error}</div>
        )}

        {data && (
          <>
            <div className="text-center mb-6">
              <p className="text-sm text-text-muted">
                Week of <span className="text-white font-bold">{formatWeekStart(data.weekStart)}</span>
              </p>
              <p className="text-[10px] text-text-muted/50 mt-1 uppercase tracking-widest">Resets every Monday · Win games to climb the ranks</p>
            </div>

            {data.entries.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center">
                <p className="text-4xl mb-4">🎯</p>
                <p className="text-text-muted font-bold mb-2">No wins recorded this week yet</p>
                <p className="text-text-muted/60 text-sm">Be the first to claim the top spot!</p>
                <Link href="/" className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/80 transition-colors">
                  Play Now
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data.entries.map((entry, i) => {
                  const rankStyle = RANK_STYLES[entry.rank] ?? { bg: 'bg-white/5 border-white/5', text: 'text-text-muted', emoji: '' };
                  return (
                    <motion.div
                      key={entry.playerName}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border ${rankStyle.bg}`}
                    >
                      <div className="w-10 text-center shrink-0">
                        {rankStyle.emoji ? (
                          <span className="text-2xl">{rankStyle.emoji}</span>
                        ) : (
                          <span className={`text-sm font-black ${rankStyle.text}`}>#{entry.rank}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-base truncate ${entry.rank <= 3 ? rankStyle.text : 'text-white'}`}>
                          {entry.playerName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-black ${entry.rank <= 3 ? rankStyle.text : 'text-white/80'}`}>{entry.wins}</p>
                        <p className="text-[9px] text-text-muted/60 uppercase tracking-widest">{entry.wins === 1 ? 'win' : 'wins'}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-8 pb-8">
              <Link href="/" className="inline-block px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/80 transition-colors">
                Play to Climb
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
