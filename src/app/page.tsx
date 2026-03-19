'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { toast } from 'sonner';
import { getStats, getRankInfo, getAchievements, getLevelInfo } from '@/lib/stats';
import { AVATARS, AI_DIFFICULTY_INFO } from '@/types/game';
import type { AIDifficulty } from '@/types/game';

const FLOATING_TOKENS = [
  { symbol: '💣', top: '10%', left: '8%', delay: 0, duration: 15 },
  { symbol: '🎉', top: '16%', left: '86%', delay: 1.2, duration: 18 },
  { symbol: '😼', top: '78%', left: '12%', delay: 0.8, duration: 17 },
  { symbol: '⚡', top: '72%', left: '84%', delay: 1.6, duration: 19 },
  { symbol: '🔥', top: '38%', left: '4%', delay: 0.3, duration: 21 },
  { symbol: '🎴', top: '44%', left: '90%', delay: 2, duration: 16 },
  // Extra tokens for desktop
  { symbol: '🃏', top: '25%', left: '50%', delay: 1.1, duration: 20, desktopOnly: true },
  { symbol: '✨', top: '85%', left: '50%', delay: 2.5, duration: 14, desktopOnly: true },
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
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [bestOf, setBestOf] = useState<0 | 3 | 5>(0); // 0 = single match
  const [joinCode, setJoinCode] = useState(joinParam || '');
  const [loading, setLoading] = useState(false);
  const [quickStats, setQuickStats] = useState({ gamesPlayed: 0, wins: 0, winStreak: 0 });
  const [rankTitle, setRankTitle] = useState('Rookie Spark');
  const [levelNumber, setLevelNumber] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [levelRemainingXp, setLevelRemainingXp] = useState(120);
  const [nextUnlock, setNextUnlock] = useState<string | null>(null);

  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

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
    // Show tutorial prompt for new players who haven't played or done the tutorial
    const tutorialDone = localStorage.getItem('ek_tutorial_done');
    const gamesCount = stats.gamesPlayed ?? 0;
    if (!tutorialDone && gamesCount === 0) {
      setShowTutorialPrompt(true);
    }
  }, []);

  async function createGame() {
    if (!playerName.trim()) {
      toast.error('Enter your name first');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'multiplayer') {
        // Multiplayer → create a pre-game lobby room
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: playerName.trim(), avatar }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        localStorage.setItem(`ek_room_${data.code}`, data.playerId);
        localStorage.setItem('ek_playerName', playerName.trim());
        localStorage.setItem('ek_avatar', String(avatar));
        router.push(`/lobby/${data.code}`);
      } else {
        // Single-player vs AI — start immediately
        const res = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: playerName.trim(),
            avatar,
            mode: 'single',
            aiCount,
            aiDifficulty,
            bestOf: bestOf || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        localStorage.setItem(`ek_player_${data.gameId}`, data.playerId);
        localStorage.setItem('ek_playerName', playerName.trim());
        localStorage.setItem('ek_avatar', String(avatar));
        router.push(`/game/${data.gameId}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  function joinGame() {
    // Navigate to the lobby room — player will join from there
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error('Enter a room code');
      return;
    }
    // Save name/avatar for pre-fill on lobby page
    if (playerName.trim()) {
      localStorage.setItem('ek_playerName', playerName.trim());
      localStorage.setItem('ek_avatar', String(avatar));
    }
    router.push(`/lobby/${code}`);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 md:p-6 lg:p-12 relative overflow-x-hidden overflow-y-auto scroll-touch lg:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] lg:from-surface-light/40 lg:via-bg lg:to-bg">
      {/* Floating tokens — hidden on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block z-0">
        {FLOATING_TOKENS.map((token, i) => (
          <motion.div
            key={`token-${i}`}
            className={`absolute text-5xl lg:text-7xl opacity-15 lg:opacity-25 ${token.desktopOnly ? 'hidden lg:block' : ''}`}
            style={{ top: token.top, left: token.left }}
            animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: token.duration, repeat: Infinity, delay: token.delay, ease: "easeInOut" }}
          >
            {token.symbol}
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-7xl mx-auto z-10 relative">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center"
            >
              {/* Left Column: Hero Branding */}
              <div className="text-center lg:text-left mb-8 lg:mb-0">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                  <span className="status-pill lg:scale-110 lg:origin-left">Party Card Game</span>
                  <span className="status-pill lg:scale-110 lg:origin-left">2-5 players</span>
                </div>

                <div className="mb-6 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-warning/50 bg-warning/20 text-warning text-sm font-extrabold uppercase tracking-[0.1em] shadow-[0_0_15px_rgba(255,184,51,0.2)]">
                    👑 {rankTitle}
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-success/50 bg-success/20 text-success text-sm font-extrabold uppercase tracking-[0.1em] shadow-[0_0_15px_rgba(43,212,124,0.2)]">
                    ⭐ Level {levelNumber}
                  </span>
                </div>

                <motion.div 
                  className="text-7xl md:text-[120px] lg:text-[160px] mb-4 drop-shadow-[0_0_50px_rgba(255,95,46,0.8)] lg:mb-8" 
                  animate={{ y: [0, -15, 0], rotate: [-3, 3, -3], scale: [1, 1.05, 1] }} 
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  💣
                </motion.div>

                <h1 className="display-font text-5xl md:text-7xl lg:text-8xl leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-[#ffffff] via-[#ffd27a] to-[#ff432e] mb-4 filter drop-shadow-[0_8px_24px_rgba(255,95,46,0.5)]">
                  EXPLODING<br className="hidden md:block"/>KITTENS
                </h1>
                <p className="subtle-text text-base md:text-xl lg:text-2xl mb-8 font-medium lg:max-w-md lg:leading-relaxed">
                  Bluff hard. Play dirty. Don&apos;t pull the bomb. The ultimate game of russian roulette, now with cats.
                </p>

                {quickStats.gamesPlayed > 0 && (
                  <div className="hidden lg:grid grid-cols-3 gap-4 text-left max-w-md">
                    <StatChip label="Games" value={quickStats.gamesPlayed} tone="muted" />
                    <StatChip label="Wins" value={quickStats.wins} tone="success" />
                    <StatChip label="Streak" value={quickStats.winStreak} tone="warning" />
                  </div>
                )}
              </div>

              {/* Right Column: Controls */}
              <div className="glass-panel rounded-[2rem] lg:rounded-[3rem] w-full px-5 py-6 md:p-9 lg:p-12 text-center lg:shadow-[0_0_80px_rgba(255,95,46,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
                
                <div className="space-y-4 lg:space-y-6">
                  <motion.button
                    id="start-friends-btn"
                    whileHover={{ scale: 1.03, boxShadow: "0 20px 40px rgba(255,95,46,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push('/lobby')}
                    className="cta-primary w-full py-4 lg:py-6 px-6 text-base md:text-xl lg:text-2xl rounded-2xl"
                  >
                    🎉 Start Friend Lobby
                  </motion.button>

                  <motion.button
                    id="start-ai-btn"
                    whileHover={{ scale: 1.03, boxShadow: "0 20px 40px rgba(38,170,213,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setMode('ai');
                      setScreen('setup');
                    }}
                    className="cta-secondary w-full py-4 lg:py-6 px-6 text-base md:text-xl lg:text-2xl rounded-2xl"
                  >
                    🤖 Quick Match vs AI
                  </motion.button>

                  <motion.button
                    id="join-code-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push('/lobby?tab=join')}
                    className="cta-ghost w-full py-4 lg:py-6 px-6 text-base md:text-xl lg:text-2xl rounded-2xl"
                  >
                    🔗 Join with Room Code
                  </motion.button>
                </div>

                {quickStats.gamesPlayed > 0 && (
                  <div className="mt-8 grid grid-cols-3 gap-2 text-left lg:hidden">
                    <StatChip label="Games" value={quickStats.gamesPlayed} tone="muted" />
                    <StatChip label="Wins" value={quickStats.wins} tone="success" />
                    <StatChip label="Streak" value={quickStats.winStreak} tone="warning" />
                  </div>
                )}

                <div className="mt-6 lg:mt-10 rounded-2xl border border-border/50 bg-surface-light/40 px-4 py-4 lg:px-6 lg:py-5 text-sm lg:text-base backdrop-blur-md">
                  <div className="flex items-center justify-between text-text-muted mb-2 font-medium">
                    <span>Level {levelNumber}</span>
                    <span>{levelRemainingXp} XP to next level</span>
                  </div>
                  <div className="h-2 lg:h-3 rounded-full bg-surface overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-success via-accent to-warning"
                    />
                  </div>
                  {nextUnlock && (
                    <div className="mt-3 text-left text-text-muted">
                      Next unlock: <span className="text-text font-bold">{nextUnlock}</span>
                    </div>
                  )}
                </div>

                {/* First-game tutorial prompt */}
                <AnimatePresence>
                  {showTutorialPrompt && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6 rounded-2xl p-4 border relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(170,51,255,0.12), rgba(19,15,37,0.95))',
                        borderColor: 'rgba(170,51,255,0.4)',
                        boxShadow: '0 0 24px rgba(170,51,255,0.1)',
                      }}
                    >
                      <button
                        onClick={() => setShowTutorialPrompt(false)}
                        className="absolute top-2 right-3 text-text-muted/50 hover:text-text-muted text-lg leading-none transition-colors"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">🎓</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-white mb-1">New to Exploding Kittens?</p>
                          <p className="text-xs text-text-muted leading-relaxed mb-3">
                            Learn the rules interactively with our 3-minute coached tutorial before your first game.
                          </p>
                          <Link
                            href="/tutorial"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-white transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #aa33ff, #7722cc)',
                              boxShadow: '0 4px 12px rgba(170,51,255,0.3)',
                            }}
                          >
                            Start Tutorial →
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 lg:mt-8 flex items-center justify-center gap-6 text-sm lg:text-base">
                  <Link href="/stats" className="text-text-muted hover:text-text active:text-accent transition-colors py-2 px-1 font-medium">
                    View Stats
                  </Link>
                  <span className="text-border/50">•</span>
                  <Link href="/rules" className="text-text-muted hover:text-text active:text-accent transition-colors py-2 px-1 font-medium">
                    How to Play
                  </Link>
                  <span className="text-border/50">•</span>
                  <Link href="/cards" className="text-text-muted hover:text-text active:text-accent transition-colors py-2 px-1 font-medium">
                    Card Guide
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="glass-panel rounded-[1.75rem] lg:rounded-[2.5rem] max-w-xl mx-auto w-full p-6 md:p-10 lg:p-12 shadow-[0_0_60px_rgba(0,0,0,0.5)] border-t-accent/30"
            >
              <button onClick={() => setScreen('home')} className="text-text-muted hover:text-text active:text-text mb-6 py-2 pr-4 min-h-[44px] flex items-center transition-colors lg:text-lg">
                <span className="mr-2">←</span> Back to Main Menu
              </button>

              <h2 className="display-font text-3xl md:text-4xl lg:text-5xl mb-3 text-warning drop-shadow-md">
                {mode === 'ai' ? 'Quick Match Setup' : 'Friend Lobby Setup'}
              </h2>
              <p className="subtle-text mb-8 text-base lg:text-lg">
                {mode === 'ai'
                  ? 'Set your vibe and jump in. The AI is ruthless.'
                  : 'Create a room, share the code, and start chaos.'}
              </p>

              <div className="mb-8">
                <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">Your Name</label>
                <input
                  id="player-name-input"
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={20}
                  autoFocus
                  className="w-full py-4 px-5 rounded-2xl bg-surface-light/85 border-2 border-border focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 text-text text-xl transition-all shadow-inner"
                />
              </div>

              <div className="mb-8">
                <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">Choose Avatar</label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 lg:gap-4">
                  {AVATARS.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setAvatar(i)}
                      className={`text-3xl md:text-4xl p-3 lg:p-4 rounded-2xl transition-all flex items-center justify-center ${
                        avatar === i
                          ? 'bg-accent/20 border-2 border-accent shadow-[0_0_20px_rgba(255,95,46,0.3)]'
                          : 'bg-surface-light/65 border-2 border-transparent hover:border-border hover:bg-surface-light'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {mode === 'ai' && (
                <>
                  <div className="mb-8">
                    <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">Opponents</label>
                    <div className="grid grid-cols-4 gap-3 lg:gap-4">
                      {[1, 2, 3, 4].map(n => (
                        <motion.button
                          key={n}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setAiCount(n)}
                          className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                            aiCount === n
                              ? 'cta-primary shadow-lg'
                              : 'bg-surface-light/70 text-text-muted hover:text-text border-2 border-border hover:border-text-muted/50'
                          }`}
                        >
                          {n}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-10">
                    <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">AI Difficulty</label>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      {(Object.keys(AI_DIFFICULTY_INFO) as AIDifficulty[]).map(diff => {
                        const info = AI_DIFFICULTY_INFO[diff];
                        const isSelected = aiDifficulty === diff;
                        return (
                          <motion.button
                            key={diff}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setAiDifficulty(diff)}
                            className={`py-3 px-4 rounded-2xl font-bold text-left transition-all ${
                              isSelected
                                ? 'shadow-lg border-2'
                                : 'bg-surface-light/70 text-text-muted hover:text-text border-2 border-border hover:border-text-muted/50'
                            }`}
                            style={isSelected ? {
                              borderColor: info.color,
                              backgroundColor: `${info.color}15`,
                              boxShadow: `0 0 20px ${info.color}30`,
                            } : undefined}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{info.emoji}</span>
                              <span className="text-sm font-black uppercase tracking-wider" style={isSelected ? { color: info.color } : undefined}>
                                {info.label}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-70 leading-tight">{info.description}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="mb-10">
                <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">Match Type</label>
                <div className="grid grid-cols-3 gap-3 lg:gap-4">
                  {([0, 3, 5] as const).map(n => (
                    <motion.button
                      key={n}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setBestOf(n)}
                      className={`py-4 rounded-2xl font-bold text-sm transition-all ${
                        bestOf === n
                          ? 'cta-primary shadow-lg'
                          : 'bg-surface-light/70 text-text-muted hover:text-text border-2 border-border hover:border-text-muted/50'
                      }`}
                    >
                      {n === 0 ? 'Single' : `Best of ${n}`}
                    </motion.button>
                  ))}
                </div>
                {bestOf > 0 && (
                  <p className="text-text-muted text-xs mt-2">
                    First to {Math.ceil(bestOf / 2)} wins takes the series
                  </p>
                )}
              </div>

              <motion.button
                id="create-game-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createGame}
                disabled={loading}
                className="cta-primary w-full py-5 px-6 text-xl lg:text-2xl rounded-2xl disabled:opacity-60 font-black tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Preparing...
                  </span>
                ) : mode === 'ai' ? (
                  'ENTER ARENA'
                ) : (
                  'CREATE LOBBY'
                )}
              </motion.button>
            </motion.div>
          )}

          {screen === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="glass-panel rounded-[1.75rem] lg:rounded-[2.5rem] max-w-xl mx-auto w-full p-6 md:p-10 lg:p-12 shadow-[0_0_60px_rgba(47,209,159,0.15)] border-t-[#2fd19f]/30"
            >
              <button onClick={() => setScreen('home')} className="text-text-muted hover:text-text active:text-text mb-6 py-2 pr-4 min-h-[44px] flex items-center transition-colors lg:text-lg">
                <span className="mr-2">←</span> Back to Main Menu
              </button>

              <h2 className="display-font text-3xl md:text-4xl lg:text-5xl text-[#2fd19f] mb-3 drop-shadow-md">Join Friend Lobby</h2>
              <p className="subtle-text mb-8 text-base lg:text-lg">Drop your name, pick a cat, and jump into the room.</p>

              <div className="mb-8">
                <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">Your Name</label>
                <input
                  id="join-player-name-input"
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={20}
                  autoFocus
                  className="w-full py-4 px-5 rounded-2xl bg-surface-light/85 border-2 border-border focus:border-[#2fd19f] focus:outline-none focus:ring-4 focus:ring-[#2fd19f]/20 text-text text-xl transition-all shadow-inner"
                />
              </div>

              <div className="mb-8">
                <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">Choose Avatar</label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 lg:gap-4">
                  {AVATARS.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setAvatar(i)}
                      className={`text-3xl md:text-4xl p-3 lg:p-4 rounded-2xl transition-all flex items-center justify-center ${
                        avatar === i
                          ? 'bg-[#2fd19f]/20 border-2 border-[#2fd19f] shadow-[0_0_20px_rgba(47,209,159,0.3)]'
                          : 'bg-surface-light/65 border-2 border-transparent hover:border-border hover:bg-surface-light'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="mb-10">
                <label className="text-sm lg:text-base font-bold text-text-muted mb-3 block uppercase tracking-wider">6-Letter Room Code</label>
                <input
                  id="join-code-input"
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full py-5 px-5 rounded-2xl bg-surface-light/85 border-2 border-border focus:border-[#2fd19f] focus:outline-none focus:ring-4 focus:ring-[#2fd19f]/20 text-text text-3xl lg:text-4xl text-center tracking-[0.4em] font-mono uppercase shadow-inner"
                />
              </div>

              <motion.button
                id="join-room-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={joinGame}
                disabled={loading}
                className="cta-secondary w-full py-5 px-6 text-xl lg:text-2xl rounded-2xl disabled:opacity-60 font-black tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'JOIN ROOM'
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
      ? 'text-success border-success/40 bg-success/10'
      : tone === 'warning'
        ? 'text-warning border-warning/40 bg-warning/10'
        : 'text-text-muted border-border bg-surface-light/50';

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm transition-transform hover:scale-105 ${toneClass}`}>
      <p className="text-2xl lg:text-3xl leading-none font-extrabold mb-1">{value}</p>
      <p className="text-[11px] lg:text-xs uppercase tracking-[0.1em] font-bold opacity-80">{label}</p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-bg">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
