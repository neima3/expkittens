'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { GameState, GameLog, Player } from '@/types/game';
import { AVATARS, CARD_INFO } from '@/types/game';

const SPEEDS = [0.5, 1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

const SPEED_LABELS: Record<Speed, string> = {
  0.5: '0.5x',
  1: '1x',
  2: '2x',
  4: '4x',
};

/** Detect which player died based on a log message. Returns player name or null. */
function detectDeath(message: string): string | null {
  const match = message.match(/💥 (.+?) drew an Exploding Kitten and EXPLODED!/);
  return match ? match[1] : null;
}

/** Build a "player alive" map at each log index by scanning forward. */
function buildDeathMap(logs: GameLog[], players: Player[]): Map<string, boolean>[] {
  const alive = new Map<string, boolean>(players.map(p => [p.name, true]));
  return logs.map(log => {
    const dead = detectDeath(log.message);
    if (dead) alive.set(dead, false);
    return new Map(alive);
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function LogEntry({
  log,
  active,
  onClick,
  index,
}: {
  log: GameLog;
  active: boolean;
  onClick: () => void;
  index: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [active]);

  const isChat = log.type === 'chat' || log.type === 'preset' || log.type === 'spectator_chat';
  const isDeath = log.message.includes('EXPLODED');

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.005 }}
      className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer
        ${active
          ? 'bg-accent/20 border border-accent/50 shadow-[0_0_8px_rgba(255,95,46,0.2)]'
          : isDeath
            ? 'bg-danger/8 hover:bg-danger/15 border border-transparent hover:border-danger/30'
            : isChat
              ? 'bg-[#6366f1]/8 hover:bg-[#6366f1]/15 border border-transparent'
              : 'hover:bg-surface-light/40 border border-transparent'
        }
      `}
    >
      <span className="text-[10px] text-text-muted/50 font-mono mt-0.5 shrink-0 w-16">
        {formatTime(log.timestamp)}
      </span>
      <span className={`text-xs leading-relaxed ${
        isDeath ? 'text-danger font-bold' :
        isChat ? 'text-[#a5b4fc]' :
        active ? 'text-white' :
        'text-text-muted'
      }`}>
        {isChat && log.playerName && (
          <span className="font-bold text-accent/80 mr-1">{log.playerName}:</span>
        )}
        {log.message}
      </span>
    </motion.button>
  );
}

function PlayerCard({
  player,
  isWinner,
  isAlive,
  isCurrent,
}: {
  player: Player;
  isWinner: boolean;
  isAlive: boolean;
  isCurrent: boolean;
}) {
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
        ${!isAlive ? 'opacity-40 grayscale border-danger/20 bg-danger/5' :
          isWinner ? 'border-warning/60 bg-warning/10 shadow-[0_0_12px_rgba(250,204,21,0.2)]' :
          isCurrent ? 'border-accent/50 bg-accent/10' :
          'border-white/5 bg-surface-light/20'}
      `}
    >
      <span className="text-xl">{AVATARS[player.avatar] || '😼'}</span>
      <div className="min-w-0">
        <div className={`text-sm font-black truncate ${!isAlive ? 'line-through text-danger/60' : isWinner ? 'text-warning' : 'text-white/90'}`}>
          {isWinner && '🏆 '}{player.name}
          {player.isAI && <span className="text-text-muted text-[10px] ml-1">🤖</span>}
        </div>
        <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
          {!isAlive ? '💀 EXPLODED' : `${player.hand.length} CARDS`}
        </div>
      </div>
    </motion.div>
  );
}

export default function ReplayPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const systemLogs = game?.logs.filter(l => l.type !== 'spectator_chat') ?? [];
  const deathMaps = game ? buildDeathMap(systemLogs, game.players) : [];

  const currentAlive = currentIndex >= 0 ? deathMaps[currentIndex] : null;
  const currentLog = currentIndex >= 0 ? systemLogs[currentIndex] : null;

  // Derive "current player" hint from log
  const currentPlayerName = currentLog?.message.match(/^(.+?)'s turn|^(.+?) plays|^(.+?) drew/)?.[1] ?? null;

  const winner = game ? game.players.find(p => p.id === game.winnerId) : null;

  useEffect(() => {
    fetch(`/api/replay/${shareId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setGame(data.gameState);
          setExpiresAt(data.expiresAt);
          // Start at beginning (first log)
          setCurrentIndex(0);
        }
      })
      .catch(() => setError('Failed to load replay'))
      .finally(() => setLoading(false));
  }, [shareId]);

  const goTo = useCallback((idx: number) => {
    if (!game) return;
    const clamped = Math.max(0, Math.min(systemLogs.length - 1, idx));
    setCurrentIndex(clamped);
  }, [game, systemLogs.length]);

  const step = useCallback((delta: number) => {
    setCurrentIndex(prev => Math.max(0, Math.min(systemLogs.length - 1, prev + delta)));
  }, [systemLogs.length]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !game) return;
    const intervalMs = 1200 / speed;
    const tick = () => {
      setCurrentIndex(prev => {
        if (prev >= systemLogs.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    };
    playTimerRef.current = setTimeout(tick, intervalMs);
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentIndex, speed, game, systemLogs.length]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <p className="text-text-muted">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😿</div>
          <h2 className="text-xl font-black text-white mb-2">Replay Not Found</h2>
          <p className="text-text-muted text-sm mb-6">{error || 'This replay may have expired or never existed.'}</p>
          <Link href="/" className="px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/80 transition-colors">
            Play Now
          </Link>
        </div>
      </div>
    );
  }

  const progress = systemLogs.length > 1 ? currentIndex / (systemLogs.length - 1) : 0;

  return (
    <div className="h-dvh flex flex-col bg-bg overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-[#110f1d]/95 border-b border-white/5 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">🎬</span>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate">
              Game Replay
              {winner && <span className="text-warning ml-2">• {winner.name} Wins</span>}
            </h1>
            <p className="text-[10px] text-text-muted">
              {game.players.length} players · {systemLogs.length} events
              {expiresAt && ` · Expires ${new Date(expiresAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light/60 border border-border text-xs font-bold text-text-muted hover:text-white hover:border-accent/50 transition-colors"
          >
            {copied ? '✓ Copied!' : '🔗 Share'}
          </motion.button>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg bg-accent/80 border border-accent text-xs font-bold text-white hover:bg-accent transition-colors"
          >
            Play
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[15rem_1fr_15rem] overflow-hidden">
        {/* LEFT: Player statuses */}
        <div className="hidden lg:flex flex-col border-r border-white/5 bg-black/20 overflow-y-auto p-3 gap-2">
          <div className="text-[10px] uppercase font-black text-text-muted/60 tracking-widest px-1 mb-1">Players</div>
          {game.players.map(player => {
            const isAlive = currentAlive ? (currentAlive.get(player.name) === true) : player.isAlive;
            const isWinner = player.id === game.winnerId && currentIndex === systemLogs.length - 1;
            const isCurrent = player.name === currentPlayerName;
            return (
              <PlayerCard
                key={player.id}
                player={player}
                isAlive={isAlive}
                isWinner={isWinner}
                isCurrent={isCurrent}
              />
            );
          })}

          {/* Deck / discard snapshot */}
          <div className="mt-3 px-1">
            <div className="text-[10px] uppercase font-black text-text-muted/60 tracking-widest mb-2">Final State</div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="w-10 h-14 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center mb-0.5">
                  <span className="text-sm font-black text-accent">{game.deck.length}</span>
                </div>
                <span className="text-[9px] text-text-muted/60 uppercase font-bold">Deck</span>
              </div>
              {game.discardPile.length > 0 && (
                <div className="text-center">
                  <div className="w-10 h-14 rounded-lg bg-surface-light/40 border border-border flex items-center justify-center mb-0.5 text-lg">
                    {CARD_INFO[game.discardPile[game.discardPile.length - 1].type].emoji}
                  </div>
                  <span className="text-[9px] text-text-muted/60 uppercase font-bold">Top</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Current event + log list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Current event spotlight */}
          <div className="shrink-0 p-4 bg-black/30 border-b border-white/5">
            <AnimatePresence mode="wait">
              {currentLog ? (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl px-5 py-4 text-center border
                    ${currentLog.message.includes('EXPLODED')
                      ? 'bg-danger/15 border-danger/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                      : currentIndex === systemLogs.length - 1 && winner
                        ? 'bg-warning/15 border-warning/40 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                        : 'bg-surface/60 border-border/60'
                    }
                  `}
                >
                  <p className={`text-base font-bold leading-snug ${
                    currentLog.message.includes('EXPLODED') ? 'text-danger' :
                    currentIndex === systemLogs.length - 1 && winner ? 'text-warning' :
                    'text-white/90'
                  }`}>
                    {currentLog.message}
                  </p>
                  <p className="text-[10px] text-text-muted/50 font-mono mt-1.5">
                    Event {currentIndex + 1} / {systemLogs.length} · {formatTime(currentLog.timestamp)}
                  </p>
                </motion.div>
              ) : (
                <div className="rounded-2xl px-5 py-4 text-center border border-border/30 bg-surface/30">
                  <p className="text-text-muted text-sm">Select an event to start</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div
            className="shrink-0 h-1.5 bg-surface-light/30 cursor-pointer mx-4 my-2 rounded-full overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              goTo(Math.round(ratio * (systemLogs.length - 1)));
            }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-warning rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>

          {/* Playback controls */}
          <div className="shrink-0 flex items-center justify-center gap-2 px-4 pb-3">
            <button
              onClick={() => { setIsPlaying(false); goTo(0); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-light/60 hover:bg-surface-light text-text-muted hover:text-white transition-colors text-sm font-bold"
              title="Go to start"
            >⏮</button>
            <button
              onClick={() => { setIsPlaying(false); step(-1); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-light/60 hover:bg-surface-light text-text-muted hover:text-white transition-colors text-sm font-bold"
              title="Previous event"
            >⏪</button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent hover:bg-accent/80 text-white transition-colors text-lg font-bold shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => { setIsPlaying(false); step(1); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-light/60 hover:bg-surface-light text-text-muted hover:text-white transition-colors text-sm font-bold"
              title="Next event"
            >⏩</button>
            <button
              onClick={() => { setIsPlaying(false); goTo(systemLogs.length - 1); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-light/60 hover:bg-surface-light text-text-muted hover:text-white transition-colors text-sm font-bold"
              title="Go to end"
            >⏭</button>
            <div className="flex items-center gap-1 ml-2">
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${
                    speed === s
                      ? 'bg-accent text-white'
                      : 'bg-surface-light/40 text-text-muted hover:text-white'
                  }`}
                >
                  {SPEED_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Event log list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5 scroll-touch">
            {systemLogs.map((log, i) => (
              <LogEntry
                key={`${log.timestamp}-${i}`}
                log={log}
                active={i === currentIndex}
                onClick={() => { setIsPlaying(false); goTo(i); }}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Mobile summary / desktop summary panel */}
        <div className="hidden lg:flex flex-col border-l border-white/5 bg-black/20 p-4 overflow-y-auto gap-4">
          <div>
            <div className="text-[10px] uppercase font-black text-text-muted/60 tracking-widest mb-3">Match Info</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total Events</span>
                <span className="font-bold text-white">{systemLogs.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Players</span>
                <span className="font-bold text-white">{game.players.length}</span>
              </div>
              {winner && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Winner</span>
                  <span className="font-bold text-warning">🏆 {winner.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Started</span>
                <span className="font-bold text-white text-xs">{new Date(game.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Explosion moments */}
          {(() => {
            const explosions = systemLogs.filter(l => l.message.includes('EXPLODED'));
            if (!explosions.length) return null;
            return (
              <div>
                <div className="text-[10px] uppercase font-black text-danger/60 tracking-widest mb-2">💥 Explosions</div>
                <div className="space-y-1.5">
                  {explosions.map((log, i) => {
                    const name = detectDeath(log.message);
                    const idx = systemLogs.indexOf(log);
                    return (
                      <button
                        key={i}
                        onClick={() => { setIsPlaying(false); goTo(idx); }}
                        className="w-full text-left px-3 py-2 rounded-lg bg-danger/10 hover:bg-danger/20 border border-danger/20 hover:border-danger/40 transition-colors"
                      >
                        <p className="text-xs font-bold text-danger">{name}</p>
                        <p className="text-[10px] text-danger/60 font-mono">{formatTime(log.timestamp)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Discard pile highlights */}
          {game.discardPile.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-black text-text-muted/60 tracking-widest mb-2">Cards Played</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(
                  game.discardPile.reduce((acc, card) => {
                    acc[card.type] = (acc[card.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-light/40 border border-border/50">
                    <span>{CARD_INFO[type as keyof typeof CARD_INFO]?.emoji || '🃏'}</span>
                    <span className="text-[10px] text-text-muted font-bold">×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile player strip */}
      <div className="lg:hidden shrink-0 border-t border-white/5 bg-black/30 px-3 py-2 flex gap-2 overflow-x-auto">
        {game.players.map(player => {
          const isAlive = currentAlive ? (currentAlive.get(player.name) === true) : player.isAlive;
          return (
            <div
              key={player.id}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all
                ${!isAlive ? 'opacity-40 grayscale border-danger/20' :
                  player.id === game.winnerId ? 'border-warning/40 bg-warning/10' :
                  'border-white/5 bg-surface-light/20'}
              `}
            >
              <span className="text-base">{AVATARS[player.avatar]}</span>
              <span className={`text-xs font-bold truncate max-w-[60px] ${!isAlive ? 'line-through text-danger/60' : 'text-white/90'}`}>
                {player.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
