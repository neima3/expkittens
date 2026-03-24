'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AVATARS } from '@/types/game';
import type { Room, RoomPlayer } from '@/lib/rooms-db';
import { getPersistentId } from '@/lib/identity';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my Exploding Kittens lobby!', text: `Room code: ${text}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={copy}
      className="ml-3 px-4 py-1.5 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/25 transition-colors"
    >
      {copied ? '✓ Copied!' : '📋 Copy'}
    </motion.button>
  );
}

function PlayerCard({ player, isMe, isHostViewing, onKick }: {
  player: RoomPlayer;
  isMe: boolean;
  isHostViewing: boolean;
  onKick: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
        isMe
          ? 'border-accent/40 bg-accent/8'
          : 'border-border/60 bg-surface-light/40'
      }`}
    >
      <div className="relative shrink-0">
        <span className="text-3xl">{AVATARS[player.avatar] ?? '😼'}</span>
        {player.isHost && (
          <span className="absolute -top-1.5 -right-1.5 text-xs leading-none">👑</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-text truncate">{player.name}</span>
          {isMe && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
              You
            </span>
          )}
          {player.isHost && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-warning/20 text-warning">
              Host
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <motion.div
          animate={player.isReady ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
            player.isReady
              ? 'bg-success/20 text-success border border-success/30'
              : 'bg-surface-light text-text-muted border border-border'
          }`}
        >
          {player.isReady ? '✓ Ready' : '...'}
        </motion.div>

        {isHostViewing && !player.isHost && (
          <button
            onClick={() => onKick(player.id)}
            title="Kick player"
            className="w-7 h-7 rounded-lg bg-danger/10 text-danger hover:bg-danger/25 transition-colors flex items-center justify-center text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);

  // Join form state (shown if not yet joined)
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [togglingReady, setTogglingReady] = useState(false);
  const [expansionEnabled, setExpansionEnabled] = useState(false);

  const lastEventIdRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: check if player is already in this room
  useEffect(() => {
    const savedId = localStorage.getItem(`ek_room_${code}`);
    const savedName = localStorage.getItem('ek_playerName');
    const savedAvatar = localStorage.getItem('ek_avatar');
    if (savedName) setPlayerName(savedName);
    if (savedAvatar) {
      const n = parseInt(savedAvatar, 10);
      if (!isNaN(n)) setAvatar(n);
    }

    if (savedId) {
      setMyPlayerId(savedId);
    } else {
      setShowJoinForm(true);
    }
  }, [code]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rooms/${code}?lastEventId=${lastEventIdRef.current}`
      );
      if (res.status === 404) {
        if (!kicked) toast.error('Room not found or expired');
        router.push('/lobby');
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      if (!data.changed) return;

      lastEventIdRef.current = data.lastEventId;
      const updatedRoom: Room = data.room;
      setRoom(updatedRoom);

      // Check if I was kicked
      const myId = localStorage.getItem(`ek_room_${code}`);
      if (myId && updatedRoom.status === 'waiting') {
        const stillIn = updatedRoom.players.some(p => p.id === myId);
        if (!stillIn) {
          setKicked(true);
          toast.error('You were kicked from the room');
          router.push('/lobby');
          return;
        }
      }

      // Game started — redirect all players
      if (updatedRoom.status === 'started' && updatedRoom.gameId) {
        // Store the game player ID mapping for the game page
        if (myId) {
          localStorage.setItem(`ek_player_${updatedRoom.gameId}`, myId);
        }
        router.push(`/game/${updatedRoom.gameId}`);
      }
    } catch {
      // silent
    }
  }, [code, kicked, router]);

  // Start polling once we have a player ID (or after joining)
  useEffect(() => {
    if (showJoinForm && !myPlayerId) return; // wait until joined

    // Initial poll
    poll();

    pollingRef.current = setInterval(poll, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [poll, showJoinForm, myPlayerId]);

  async function joinRoom() {
    if (!playerName.trim()) {
      toast.error('Enter your name');
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim(), avatar, persistentId: getPersistentId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`ek_room_${code}`, data.playerId);
      localStorage.setItem('ek_playerName', playerName.trim());
      localStorage.setItem('ek_avatar', String(avatar));
      setMyPlayerId(data.playerId);
      setShowJoinForm(false);
      lastEventIdRef.current = 0; // reset to get full state
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setJoining(false);
    }
  }

  async function toggleReady() {
    if (!myPlayerId || togglingReady) return;
    setTogglingReady(true);
    try {
      const res = await fetch(`/api/rooms/${code}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to update ready state');
    } finally {
      setTogglingReady(false);
    }
  }

  async function kickPlayer(targetId: string) {
    if (!myPlayerId) return;
    try {
      const res = await fetch(`/api/rooms/${code}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId, targetPlayerId: targetId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to kick player');
    }
  }

  async function startGame() {
    if (!myPlayerId || starting) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId, expansionEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        setStarting(false);
        return;
      }
      // Redirect will be handled by polling
    } catch {
      toast.error('Failed to start game');
      setStarting(false);
    }
  }

  const me = room?.players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const readyCount = room?.players.filter(p => p.isReady).length ?? 0;
  const canStart = isHost && readyCount >= 2;

  // Join form — shown when player hasn't joined yet
  if (showJoinForm) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="glass-panel rounded-2xl p-6 md:p-8 max-w-md w-full"
        >
          <Link href="/lobby" className="text-text-muted hover:text-text flex items-center gap-2 mb-6 py-1">
            ← Back to Lobby
          </Link>

          <h2 className="display-font text-2xl md:text-3xl text-[#2fd19f] mb-2">
            Join Room
          </h2>
          <p className="text-text-muted mb-6 text-sm">
            Code: <span className="font-mono font-bold text-accent tracking-widest">{code}</span>
          </p>

          <div className="mb-5">
            <label className="text-xs font-bold text-text-muted mb-2 block uppercase tracking-wider">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              placeholder="Enter your name..."
              maxLength={20}
              autoFocus
              className="w-full py-3.5 px-4 rounded-xl bg-surface-light/85 border-2 border-border focus:border-[#2fd19f] focus:outline-none focus:ring-4 focus:ring-[#2fd19f]/20 text-text text-lg transition-all"
            />
          </div>

          <div className="mb-7">
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
                  className={`text-2xl p-2 rounded-xl flex items-center justify-center transition-all ${
                    avatar === i
                      ? 'bg-[#2fd19f]/20 border-2 border-[#2fd19f]'
                      : 'bg-surface-light/65 border-2 border-transparent hover:border-border'
                  }`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={joinRoom}
            disabled={joining}
            className="cta-secondary w-full py-4 rounded-xl text-lg font-black tracking-wide disabled:opacity-60"
          >
            {joining ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining...
              </span>
            ) : (
              'JOIN ROOM'
            )}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Loading state while waiting for first poll
  if (!room) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link
          href="/lobby"
          className="text-text-muted hover:text-text transition-colors flex items-center gap-2 py-2"
        >
          ← Lobby
        </Link>
        <h1 className="display-font text-xl text-transparent bg-clip-text bg-gradient-to-r from-warning to-accent">
          WAITING ROOM
        </h1>
        <div className="w-16" />
      </header>

      <div className="max-w-xl mx-auto w-full flex flex-col gap-4">
        {/* Room Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-5 text-center"
        >
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
            Room Code
          </p>
          <div className="flex items-center justify-center">
            <span className="font-mono font-black text-5xl tracking-[0.3em] text-accent drop-shadow-[0_0_20px_rgba(255,95,46,0.5)]">
              {code}
            </span>
            <CopyButton text={code} />
          </div>
          <p className="text-xs text-text-muted mt-3">
            Share this code with friends to invite them
          </p>
        </motion.div>

        {/* Player List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-text">
              Players <span className="text-text-muted font-normal">({room.players.length}/5)</span>
            </h2>
            <div className="text-xs text-text-muted">
              {readyCount}/{room.players.length} ready
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {room.players.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === myPlayerId}
                  isHostViewing={isHost}
                  onKick={kickPlayer}
                />
              ))}
            </AnimatePresence>
          </div>

          {room.players.length < 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 border-2 border-dashed border-border/40 rounded-xl p-3 text-center text-text-muted text-sm"
            >
              Waiting for more players ({5 - room.players.length} more slots)
            </motion.div>
          )}
        </motion.div>

        {/* Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-3"
        >
          {/* Ready toggle (non-hosts) */}
          {!isHost && me && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={toggleReady}
              disabled={togglingReady}
              className={`w-full py-4 rounded-2xl text-lg font-black tracking-wide transition-all disabled:opacity-60 ${
                me.isReady
                  ? 'bg-success/20 border-2 border-success text-success hover:bg-success/30'
                  : 'cta-secondary'
              }`}
            >
              {togglingReady ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Updating...
                </span>
              ) : me.isReady ? (
                '✓ Ready — Click to Unready'
              ) : (
                '⚡ Mark as Ready'
              )}
            </motion.button>
          )}

          {/* Host start button */}
          {isHost && (
            <div className="space-y-2">
              {/* Expansion toggle */}
              <button
                onClick={() => setExpansionEnabled(v => !v)}
                className={`w-full py-3 px-4 rounded-2xl text-left transition-all border-2 ${
                  expansionEnabled
                    ? 'border-[#7B2FBE] bg-[#7B2FBE]/15 text-[#cc88ff]'
                    : 'border-border bg-surface-light/50 text-text-muted hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 ${
                    expansionEnabled ? 'border-[#7B2FBE] bg-[#7B2FBE]' : 'border-border'
                  }`}>
                    {expansionEnabled && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <p className={`font-black text-sm uppercase tracking-wider mb-0.5 ${expansionEnabled ? 'text-[#a855f7]' : ''}`}>
                      ☢️ Imploding Kittens Expansion
                    </p>
                    <p className="text-xs opacity-70">Adds Imploding Kitten, Reverse, Draw from Bottom &amp; Feral Cat</p>
                  </div>
                </div>
              </button>
              <motion.button
                whileHover={canStart ? { scale: 1.02, boxShadow: '0 20px 40px rgba(255,95,46,0.4)' } : {}}
                whileTap={canStart ? { scale: 0.97 } : {}}
                onClick={startGame}
                disabled={!canStart || starting}
                className={`w-full py-4 rounded-2xl text-lg font-black tracking-wide transition-all ${
                  canStart
                    ? 'cta-primary'
                    : 'bg-surface-light/60 text-text-muted border-2 border-border cursor-not-allowed'
                } disabled:opacity-70`}
              >
                {starting ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </span>
                ) : (
                  '🎮 START GAME'
                )}
              </motion.button>
              {!canStart && (
                <p className="text-center text-xs text-text-muted">
                  {room.players.length < 2
                    ? 'Need at least 2 players'
                    : 'Wait for players to ready up'}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Waiting indicator */}
        <div className="flex items-center justify-center gap-2 text-text-muted text-sm py-2">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-success"
          />
          <span>Live — updating every 2 seconds</span>
        </div>
      </div>
    </div>
  );
}
