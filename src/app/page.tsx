'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { toast } from 'sonner';

const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'];

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

  useEffect(() => {
    const savedName = localStorage.getItem('ek_playerName');
    const savedAvatar = localStorage.getItem('ek_avatar');
    if (savedName) setPlayerName(savedName);
    if (savedAvatar) setAvatar(parseInt(savedAvatar));
  }, []);

  async function createGame() {
    if (!playerName.trim()) {
      toast.error('Enter your name!');
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
      toast.error('Enter your name and game code!');
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
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl opacity-10"
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }}
            animate={{
              x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              rotate: [0, 360],
            }}
            transition={{ duration: 20 + i * 5, repeat: Infinity, repeatType: 'reverse' }}
          >
            {['💣', '😼', '🔧', '⚔️', '🔮', '🌮'][i]}
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-md w-full"
          >
            <motion.div
              className="text-8xl mb-4"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💣
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-black mb-2 bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent">
              Exploding
            </h1>
            <h1 className="text-5xl md:text-6xl font-black mb-8 bg-gradient-to-r from-warning to-danger bg-clip-text text-transparent">
              Kittens
            </h1>
            <p className="text-text-muted mb-10 text-lg">
              Don&apos;t draw the exploding kitten. Or else... 💥
            </p>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setMode('ai'); setScreen('setup'); }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold text-lg shadow-lg shadow-accent/20 transition-shadow hover:shadow-xl hover:shadow-accent/30"
              >
                🤖 Play vs Computer
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setMode('multiplayer'); setScreen('setup'); }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-bold text-lg shadow-lg shadow-[#6366f1]/20 transition-shadow hover:shadow-xl hover:shadow-[#6366f1]/30"
              >
                🌐 Create Online Game
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setScreen('join')}
                className="w-full py-4 px-6 rounded-2xl bg-surface-light border border-border text-text font-bold text-lg hover:border-accent/50 transition-colors"
              >
                🔗 Join with Code
              </motion.button>
            </div>

            <Link
              href="/rules"
              className="text-text-muted hover:text-accent transition-colors text-sm mt-6 inline-block"
            >
              How to Play →
            </Link>
          </motion.div>
        )}

        {screen === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md w-full"
          >
            <button
              onClick={() => setScreen('home')}
              className="text-text-muted hover:text-text mb-6 flex items-center gap-2"
            >
              ← Back
            </button>

            <h2 className="text-3xl font-bold mb-6">
              {mode === 'ai' ? '🤖 vs Computer' : '🌐 Create Game'}
            </h2>

            {/* Name input */}
            <div className="mb-6">
              <label className="text-sm text-text-muted mb-2 block">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full py-3 px-4 rounded-xl bg-surface-light border border-border focus:border-accent focus:outline-none text-text text-lg"
              />
            </div>

            {/* Avatar selection */}
            <div className="mb-6">
              <label className="text-sm text-text-muted mb-2 block">Choose Avatar</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((emoji, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAvatar(i)}
                    className={`text-3xl p-2 rounded-xl transition-all ${
                      avatar === i
                        ? 'bg-accent/20 border-2 border-accent'
                        : 'bg-surface-light border-2 border-transparent hover:border-border'
                    }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* AI count for single player */}
            {mode === 'ai' && (
              <div className="mb-8">
                <label className="text-sm text-text-muted mb-2 block">Number of Opponents</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <motion.button
                      key={n}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAiCount(n)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        aiCount === n
                          ? 'bg-accent text-white'
                          : 'bg-surface-light text-text-muted hover:text-text'
                      }`}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createGame}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold text-lg shadow-lg shadow-accent/20 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                mode === 'ai' ? 'Start Game' : 'Create Room'
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
            className="max-w-md w-full"
          >
            <button
              onClick={() => setScreen('home')}
              className="text-text-muted hover:text-text mb-6 flex items-center gap-2"
            >
              ← Back
            </button>

            <h2 className="text-3xl font-bold mb-6">🔗 Join Game</h2>

            <div className="mb-6">
              <label className="text-sm text-text-muted mb-2 block">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full py-3 px-4 rounded-xl bg-surface-light border border-border focus:border-accent focus:outline-none text-text text-lg"
              />
            </div>

            {/* Avatar selection */}
            <div className="mb-6">
              <label className="text-sm text-text-muted mb-2 block">Choose Avatar</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((emoji, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAvatar(i)}
                    className={`text-3xl p-2 rounded-xl transition-all ${
                      avatar === i
                        ? 'bg-accent/20 border-2 border-accent'
                        : 'bg-surface-light border-2 border-transparent hover:border-border'
                    }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-sm text-text-muted mb-2 block">Game Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-letter code..."
                maxLength={6}
                className="w-full py-3 px-4 rounded-xl bg-surface-light border border-border focus:border-accent focus:outline-none text-text text-2xl text-center tracking-[0.3em] font-mono uppercase"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={joinGame}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-bold text-lg shadow-lg shadow-[#6366f1]/20 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join Game'
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
