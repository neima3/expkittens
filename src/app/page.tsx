'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { toast } from 'sonner';
import StatsDisplay from '@/components/game/StatsDisplay';
import { getStats, getRankInfo, getAchievements, getLevelInfo } from '@/lib/stats';

const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'];

const FLOATING_TOKENS = [
  { symbol: '💣', top: '10%', left: '8%', delay: 0, duration: 15 },
  { symbol: '🎉', top: '16%', left: '86%', delay: 1.2, duration: 18 },
  { symbol: '😼', top: '78%', left: '12%', delay: 0.8, duration: 17 },
  { symbol: '⚡', top: '72%', left: '84%', delay: 1.6, duration: 19 },
  { symbol: '🔥', top: '38%', left: '4%', delay: 0.3, duration: 21 },
  { symbol: '🎴', top: '44%', left: '90%', delay: 2, duration: 16 },
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinParam = searchParams.get('join');
  const [screen, setScreen] = useState<'home' | 'setup' | 'join'>(joinParam ? 'join' : 'home');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [mode, setMode] = useState<'ai' | 'multiplayer'>('ai');
  const [aiCount, setAiCount] = useState(1);
  const [joinCode, setJoinCode] = useState(joinParam || '');
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [quickStats, setQuickStats] = useState({ gamesPlayed: 0, wins: 0, winStreak: 0 });
  const [rankTitle, setRankTitle] = useState('Rookie Spark');
  const [levelNumber, setLevelNumber] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [levelRemainingXp, setLevelRemainingXp] = useState(120);
  const [nextUnlock, setNextUnlock] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('ek_playerName');
    const savedAvatar = localStorage.getItem('ek_avatar');
    if (savedName) setPlayerName(savedName);
    if (savedAvatar) {
      const avatarNum = Number.parseInt(savedAvatar, 10);
      if (!Number.isNaN(avatarNum)) setAvatar(avatarNum);
    }
    const stats = getStats();
    setQuickStats({ gamesPlayed: stats.gamesPlayed, wins: stats.wins, winStreak: stats.winStreak });
    const rank = getRankInfo(stats);
    const level = getLevelInfo(stats);
    setRankTitle(rank.title);
    setLevelNumber(level.level);
    setLevelProgress(Math.round(level.progress * 100));
    setLevelRemainingXp(Math.max(0, level.nextLevelXp - level.xp));
    const next = getAchievements(stats).find(a => !a.unlocked);
    setNextUnlock(next ? `${next.emoji} ${next.title} (${next.progress}/${next.goal})` : 'All achievements unlocked');
  }, []);

  async function createGame() {
    if (!playerName.trim()) {
      toast.error('Enter your name first');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          avatar,
          mode: mode === 'ai' ? 'single' : 'multiplayer',
          aiCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`ek_player_${data.gameId}`, data.playerId);
      localStorage.setItem('ek_playerName', playerName.trim());
      localStorage.setItem('ek_avatar', String(avatar));
      router.push(`/game/${data.gameId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function joinGame() {
    if (!playerName.trim() || !joinCode.trim()) {
      toast.error('Enter your name and game code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          playerName: playerName.trim(),
          avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`ek_player_${data.gameId}`, data.playerId);
      localStorage.setItem('ek_playerName', playerName.trim());
      localStorage.setItem('ek_avatar', String(avatar));
      router.push(`/game/${data.gameId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 md:p-6 relative overflow-x-hidden overflow-y-auto scroll-touch">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {FLOATING_TOKENS.map(token => (
          <motion.div
            key={token.symbol + token.left}
            className="absolute text-4xl md:text-5xl opacity-15"
            style={{ top: token.top, left: token.left }}
            animate={{ y: [0, -12, 0], rotate: [0, 8, -8, 0] }}
            transition={{ duration: token.duration, repeat: Infinity, delay: token.delay }}
          >
            {token.symbol}
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-[2rem] max-w-xl w-full px-5 py-6 md:p-9 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="status-pill">Party Card Game</span>
              <span className="status-pill">2-5 players</span>
            </div>

            <div className="mb-4 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-warning/40 bg-warning/10 text-warning text-xs font-extrabold uppercase tracking-[0.08em]">
                👑 {rankTitle}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/40 bg-success/10 text-success text-xs font-extrabold uppercase tracking-[0.08em]">
                ⭐ Level {levelNumber}
              </span>
            </div>

            <motion.div className="text-7xl md:text-8xl mb-2" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.3, repeat: Infinity }}>
              💣
            </motion.div>

            <h1 className="display-font text-4xl md:text-5xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ff8d44] via-[#ffd27a] to-[#ff5f2e] mb-2">
              Exploding Kittens
            </h1>
            <p className="subtle-text text-base md:text-lg mb-8">
              Bluff hard. Play dirty. Don&apos;t pull the bomb.
            </p>

            <div className="space-y-3">
              <motion.button
                id="start-friends-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setMode('multiplayer');
                  setScreen('setup');
                }}
                className="cta-primary w-full py-4 px-6 text-base md:text-lg"
              >
                🎉 Start Friend Lobby
              </motion.button>

              <motion.button
                id="start-ai-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setMode('ai');
                  setScreen('setup');
                }}
                className="cta-secondary w-full py-4 px-6 text-base md:text-lg"
              >
                🤖 Quick Match vs AI
              </motion.button>

              <motion.button
                id="join-code-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setScreen('join')}
                className="cta-ghost w-full py-4 px-6 text-base md:text-lg"
              >
                🔗 Join with Room Code
              </motion.button>
            </div>

            {quickStats.gamesPlayed > 0 && (
              <div className="mt-7 grid grid-cols-3 gap-2 text-left">
                <StatChip label="Games" value={quickStats.gamesPlayed} tone="muted" />
                <StatChip label="Wins" value={quickStats.wins} tone="success" />
                <StatChip label="Streak" value={quickStats.winStreak} tone="warning" />
              </div>
            )}

            <div className="mt-3 rounded-xl border border-border bg-surface-light/55 px-3 py-2 text-xs">
              <div className="flex items-center justify-between text-text-muted mb-1.5">
                <span>Level {levelNumber}</span>
                <span>{levelRemainingXp} XP to next level</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-success to-accent"
                />
              </div>
            </div>

            {nextUnlock && (
              <div className="mt-3 rounded-xl border border-border bg-surface-light/55 px-3 py-2 text-xs text-text-muted">
                Next unlock: <span className="text-text">{nextUnlock}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button onClick={() => setShowStats(true)} className="text-text-muted active:text-accent py-2 px-1">
                View Stats
              </button>
              <span className="text-border">•</span>
              <Link href="/rules" className="text-text-muted active:text-accent py-2 px-1">
                Rules
              </Link>
            </div>
          </motion.div>
        )}

        {screen === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-[1.75rem] max-w-lg w-full p-5 md:p-8"
          >
            <button onClick={() => setScreen('home')} className="text-text-muted active:text-text mb-5 py-2 pr-4 min-h-[44px] flex items-center">
              ← Back
            </button>

            <h2 className="display-font text-2xl md:text-3xl mb-1 text-warning">
              {mode === 'ai' ? 'Quick Match Setup' : 'Friend Lobby Setup'}
            </h2>
            <p className="subtle-text mb-6 text-sm">
              {mode === 'ai'
                ? 'Set your vibe and jump in.'
                : 'Create a room, share the code, and start chaos.'}
            </p>

            <div className="mb-5">
              <label className="text-sm text-text-muted mb-2 block">Your Name</label>
              <input
                id="player-name-input"
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full py-3.5 px-4 rounded-xl bg-surface-light/85 border border-border focus:border-accent focus:outline-none text-text text-lg"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm text-text-muted mb-2 block">Choose Avatar</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((emoji, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAvatar(i)}
                    className={`text-2xl md:text-3xl p-2 rounded-xl transition-all ${
                      avatar === i
                        ? 'bg-accent/20 border-2 border-accent shadow-lg shadow-accent/25'
                        : 'bg-surface-light/65 border-2 border-transparent hover:border-border'
                    }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            {mode === 'ai' && (
              <div className="mb-7">
                <label className="text-sm text-text-muted mb-2 block">Number of AI Opponents</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <motion.button
                      key={n}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setAiCount(n)}
                      className={`py-3 rounded-xl font-bold transition-all ${
                        aiCount === n
                          ? 'cta-primary'
                          : 'bg-surface-light/70 text-text-muted hover:text-text border border-border'
                      }`}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <motion.button
              id="create-game-btn"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={createGame}
              disabled={loading}
              className="cta-primary w-full py-4 px-6 text-lg disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : mode === 'ai' ? (
                'Start Match'
              ) : (
                'Create Lobby'
              )}
            </motion.button>
          </motion.div>
        )}

        {screen === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-[1.75rem] max-w-lg w-full p-5 md:p-8"
          >
            <button onClick={() => setScreen('home')} className="text-text-muted active:text-text mb-5 py-2 pr-4 min-h-[44px] flex items-center">
              ← Back
            </button>

            <h2 className="display-font text-2xl md:text-3xl text-[#2fd19f] mb-1">Join Friend Lobby</h2>
            <p className="subtle-text mb-6 text-sm">Drop your name, pick a cat, and jump into the room.</p>

            <div className="mb-5">
              <label className="text-sm text-text-muted mb-2 block">Your Name</label>
              <input
                id="join-player-name-input"
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full py-3.5 px-4 rounded-xl bg-surface-light/85 border border-border focus:border-accent focus:outline-none text-text text-lg"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm text-text-muted mb-2 block">Choose Avatar</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((emoji, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAvatar(i)}
                    className={`text-2xl md:text-3xl p-2 rounded-xl transition-all ${
                      avatar === i
                        ? 'bg-[#2fd19f]/20 border-2 border-[#2fd19f] shadow-lg shadow-[#2fd19f]/20'
                        : 'bg-surface-light/65 border-2 border-transparent hover:border-border'
                    }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <label className="text-sm text-text-muted mb-2 block">6-Letter Room Code</label>
              <input
                id="join-code-input"
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full py-3.5 px-4 rounded-xl bg-surface-light/85 border border-border focus:border-[#2fd19f] focus:outline-none text-text text-2xl text-center tracking-[0.3em] font-mono uppercase"
              />
            </div>

            <motion.button
              id="join-room-btn"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={joinGame}
              disabled={loading}
              className="cta-secondary w-full py-4 px-6 text-lg disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join Room'
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <StatsDisplay show={showStats} onClose={() => setShowStats(false)} />
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'muted' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success border-success/40'
      : tone === 'warning'
        ? 'text-warning border-warning/40'
        : 'text-text border-border';

  return (
    <div className={`rounded-xl border px-3 py-2 bg-surface-light/55 ${toneClass}`}>
      <p className="text-lg leading-none font-extrabold">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.08em] opacity-80 mt-1">{label}</p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
