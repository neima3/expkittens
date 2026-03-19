'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AVATARS } from '@/types/game';
import type { Room } from '@/lib/rooms-db';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'browse' | 'create' | 'join' | null;
  const [screen, setScreen] = useState<'browse' | 'create' | 'join'>(tabParam ?? 'browse');
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('ek_playerName');
    const savedAvatar = localStorage.getItem('ek_avatar');
    if (savedName) setPlayerName(savedName);
    if (savedAvatar) {
      const n = parseInt(savedAvatar, 10);
      if (!isNaN(n)) setAvatar(n);
    }
  }, []);

  const fetchPublicRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms/public');
      if (!res.ok) return;
      const data = await res.json();
      setPublicRooms(data.rooms ?? []);
    } catch {
      // silent
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchPublicRooms]);

  async function createRoom() {
    if (!playerName.trim()) {
      toast.error('Enter your name first');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim(), avatar, isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`ek_room_${data.code}`, data.playerId);
      localStorage.setItem('ek_playerName', playerName.trim());
      localStorage.setItem('ek_avatar', String(avatar));
      router.push(`/lobby/${data.code}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  function joinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      toast.error('Enter a valid 6-character room code');
      return;
    }
    router.push(`/lobby/${code}`);
  }

  function joinPublicRoom(code: string) {
    router.push(`/lobby/${code}`);
  }

  return (
    <div className="min-h-dvh flex flex-col p-4 md:p-6 lg:p-10">
      <header className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="text-text-muted hover:text-text transition-colors flex items-center gap-2 py-2"
        >
          <span>←</span>
          <span className="font-medium">Back</span>
        </Link>
        <h1 className="display-font text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-warning to-accent">
          GAME LOBBY
        </h1>
        <div className="w-16" />
      </header>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 glass-panel rounded-2xl p-1 max-w-sm mx-auto w-full">
        {(['browse', 'create', 'join'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setScreen(tab)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
              screen === tab
                ? 'bg-accent text-white shadow-lg'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab === 'browse' ? '🔭 Browse' : tab === 'create' ? '➕ Create' : '🔗 Join'}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* Browse screen */}
          {screen === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text">Public Rooms</h2>
                <button
                  onClick={fetchPublicRooms}
                  className="text-text-muted hover:text-text text-sm py-1 px-3 rounded-lg transition-colors"
                >
                  ↻ Refresh
                </button>
              </div>

              {loadingRooms ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : publicRooms.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel rounded-2xl p-10 text-center"
                >
                  <div className="text-5xl mb-4">😿</div>
                  <p className="text-text-muted text-lg font-medium">No public rooms open</p>
                  <p className="text-text-muted text-sm mt-1">Be the first — create one!</p>
                  <button
                    onClick={() => setScreen('create')}
                    className="cta-primary mt-6 px-8 py-3 rounded-xl text-sm font-bold"
                  >
                    Create Room
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {publicRooms.map(room => (
                      <motion.div
                        key={room.code}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-panel rounded-2xl p-4 flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-accent tracking-widest">
                              {room.code}
                            </span>
                            <span className="text-xs text-text-muted">
                              · {room.players[0]?.name}&apos;s room
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {room.players.map(p => (
                              <span key={p.id} className="text-xl" title={p.name}>
                                {AVATARS[p.avatar] ?? '😼'}
                              </span>
                            ))}
                            <span className="text-xs text-text-muted ml-1">
                              {room.players.length}/5
                            </span>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => joinPublicRoom(room.code)}
                          className="cta-secondary px-5 py-2.5 rounded-xl text-sm font-bold shrink-0"
                        >
                          Join
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* Create screen */}
          {screen === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-panel rounded-2xl p-6 md:p-8"
            >
              <h2 className="display-font text-2xl md:text-3xl text-warning mb-6">Create Room</h2>

              <div className="mb-6">
                <label className="text-xs font-bold text-text-muted mb-2 block uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={20}
                  autoFocus
                  className="w-full py-4 px-4 rounded-xl bg-surface-light/85 border-2 border-border focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 text-text text-lg transition-all"
                />
              </div>

              <div className="mb-6">
                <label className="text-xs font-bold text-text-muted mb-2 block uppercase tracking-wider">
                  Choose Avatar
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {AVATARS.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setAvatar(i)}
                      className={`text-2xl p-2.5 rounded-xl flex items-center justify-center transition-all ${
                        avatar === i
                          ? 'bg-accent/20 border-2 border-accent shadow-[0_0_15px_rgba(255,95,46,0.3)]'
                          : 'bg-surface-light/65 border-2 border-transparent hover:border-border'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="text-xs font-bold text-text-muted mb-2 block uppercase tracking-wider">
                  Room Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: false, label: '🔒 Private', desc: 'Invite by code only' },
                    { value: true, label: '🌐 Public', desc: 'Listed in lobby' },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setIsPublic(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isPublic === opt.value
                          ? 'border-accent bg-accent/10 text-text'
                          : 'border-border bg-surface-light/50 text-text-muted hover:border-border/80'
                      }`}
                    >
                      <div className="font-bold text-sm">{opt.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createRoom}
                disabled={loading}
                className="cta-primary w-full py-4 rounded-xl text-lg font-black tracking-wide disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'CREATE ROOM'
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Join screen */}
          {screen === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-panel rounded-2xl p-6 md:p-8"
            >
              <h2 className="display-font text-2xl md:text-3xl text-[#2fd19f] mb-6">
                Join by Code
              </h2>

              <div className="mb-8">
                <label className="text-xs font-bold text-text-muted mb-2 block uppercase tracking-wider">
                  6-Letter Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && joinByCode()}
                  placeholder="ABC123"
                  maxLength={6}
                  autoFocus
                  className="w-full py-5 px-5 rounded-xl bg-surface-light/85 border-2 border-border focus:border-[#2fd19f] focus:outline-none focus:ring-4 focus:ring-[#2fd19f]/20 text-text text-4xl text-center tracking-[0.5em] font-mono uppercase shadow-inner"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={joinByCode}
                className="cta-secondary w-full py-4 rounded-xl text-lg font-black tracking-wide"
              >
                GO TO ROOM
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
