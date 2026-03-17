'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Player, GameLog } from '@/types/game';
import { AVATARS, CARD_INFO } from '@/types/game';
import GameLogComponent from '@/components/game/GameLog';
import DiscardPile from '@/components/game/DiscardPile';

const SPECTATOR_PRESETS = [
  'GG', 'Nice play!', 'Wow', 'RIP',
  'So close!', 'Big brain', 'Unlucky', 'Hype!',
];

interface SpectatorViewProps {
  game: GameState;
  spectatorId: string;
  spectatorName: string;
  isEliminatedPlayer?: boolean;
  onLeave: () => void;
}

export default function SpectatorView({
  game,
  spectatorId,
  spectatorName,
  isEliminatedPlayer,
  onLeave,
}: SpectatorViewProps) {
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [sending, setSending] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPlayer = game.players[game.currentPlayerIndex];
  const alivePlayers = game.players.filter(p => p.isAlive);
  const eliminatedPlayers = game.players.filter(p => !p.isAlive);
  const spectatorCount = (game.spectators?.length || 0) + eliminatedPlayers.length;

  // Filter logs to only show spectator_chat and system messages
  const spectatorLogs = game.logs.filter(l => l.type !== 'chat' && l.type !== 'preset');
  const spectatorChatLogs = game.logs.filter(l => l.type === 'spectator_chat');

  const startCooldown = useCallback(() => {
    setCooldown(true);
    setCooldownTime(5);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current!);
          cooldownTimer.current = null;
          setCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const sendChat = useCallback(async (text?: string, preset?: string) => {
    if (sending || cooldown) return;
    setSending(true);
    try {
      const body: Record<string, string> = { spectatorId };
      if (preset) body.preset = preset;
      else if (text) body.message = text;
      else return;

      const res = await fetch(`/api/games/${game.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage('');
        startCooldown();
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }, [game.id, spectatorId, sending, cooldown, startCooldown]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-bg relative">
      {/* Spectator banner */}
      <div className="bg-[#1a1633]/90 border-b border-[#6366f1]/30 px-4 py-3 safe-top safe-x flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/40 text-[#a5b4fc] text-xs font-black uppercase tracking-widest">
            {isEliminatedPlayer ? '💀 Spectating' : '👁 Spectator'}
          </span>
          <span className="text-sm text-text-muted">{spectatorName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            👁 {spectatorCount} watching
          </span>
          <button
            onClick={onLeave}
            className="px-3 py-1.5 rounded-lg bg-surface-light/60 border border-border text-xs text-text-muted hover:text-text hover:border-accent transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[16rem_1fr_16rem] overflow-hidden">
        {/* LEFT: Game Log */}
        <div className="hidden lg:flex flex-col border-r border-white/5 bg-black/20 overflow-hidden">
          <div className="p-4 border-b border-white/5 text-sm font-black text-text-muted uppercase tracking-wider bg-surface-light/40">
            Game Log
          </div>
          <div className="flex-1 overflow-y-auto p-3 scroll-touch text-sm">
            <GameLogComponent logs={spectatorLogs} />
          </div>
        </div>

        {/* CENTER: Game view */}
        <div className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto scroll-touch">
          {/* Player status cards */}
          <div className="w-full max-w-2xl mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {game.players.map(player => {
                const isCurrent = player.id === currentPlayer?.id;
                return (
                  <motion.div
                    key={player.id}
                    layout
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
                      ${!player.isAlive ? 'opacity-50 border-danger/30 bg-danger/5 grayscale' : ''}
                      ${isCurrent && player.isAlive ? 'border-accent bg-accent/10 shadow-[0_0_16px_rgba(255,95,46,0.3)]' : 'border-white/5 bg-[#1f183b]/60'}
                    `}
                  >
                    <div className="relative">
                      <span className="text-2xl">{AVATARS[player.avatar] || '😼'}</span>
                      {isCurrent && player.isAlive && (
                        <motion.div
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-[#130f25]"
                        />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <div className={`text-sm font-black leading-none mb-1 truncate ${!player.isAlive ? 'line-through text-danger/80' : 'text-white/95'}`}>
                        {player.name}
                        {player.isAI && <span className="text-text-muted text-[10px] ml-1 opacity-70">🤖</span>}
                      </div>
                      {player.isAlive ? (
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded">
                          {player.hand.length} CARDS
                        </span>
                      ) : (
                        <span className="text-[10px] text-danger font-bold uppercase tracking-widest bg-danger/10 px-1.5 py-0.5 rounded">
                          💀 DEAD
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Turn indicator */}
          {game.status === 'playing' && currentPlayer && (
            <motion.div
              key={game.currentPlayerIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center px-6 py-2 rounded-full text-base font-black tracking-wide border bg-surface-light/90 text-text-muted border-border mb-6"
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">{AVATARS[currentPlayer.avatar]}</span>
                {currentPlayer.name}&apos;s Turn
                {game.turnsRemaining > 1 && <span className="text-warning">({game.turnsRemaining} turns)</span>}
              </span>
            </motion.div>
          )}

          {/* Discard pile + deck info */}
          <div className="flex items-center gap-8 rounded-3xl bg-surface/60 border border-border/70 px-6 py-5 shadow-xl mb-6">
            <div className="text-center">
              <div className="w-16 h-24 rounded-xl bg-accent/20 border-2 border-accent/40 flex items-center justify-center mb-1">
                <span className="text-2xl font-black text-accent">{game.deck.length}</span>
              </div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Deck</span>
            </div>
            <DiscardPile cards={game.discardPile} onPreview={() => {}} onPreviewEnd={() => {}} />
          </div>

          {/* Last action */}
          {game.logs.length > 0 && (
            <motion.div
              key={game.logs[game.logs.length - 1].timestamp}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl w-full text-center text-xs text-text bg-surface/65 border border-border/70 rounded-full px-3 py-1.5 truncate mb-4"
            >
              {game.logs[game.logs.length - 1].message}
            </motion.div>
          )}

          {/* Mobile game log toggle */}
          <MobileLogToggle logs={spectatorLogs} />

          {/* Game finished state */}
          {game.status === 'finished' && game.winnerId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 text-center p-6 rounded-2xl bg-surface-light/60 border border-warning/30"
            >
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-xl font-black text-warning">
                {game.players.find(p => p.id === game.winnerId)?.name} Wins!
              </p>
            </motion.div>
          )}
        </div>

        {/* RIGHT: Spectator Chat */}
        <div className="hidden lg:flex flex-col border-l border-white/5 bg-black/20 overflow-hidden">
          <div className="p-4 border-b border-white/5 text-sm font-black text-[#a5b4fc] uppercase tracking-wider bg-[#1a1633]/60 flex items-center gap-2">
            <span>👁</span> Spectator Chat
          </div>
          <div className="flex-1 overflow-y-auto p-3 scroll-touch text-sm space-y-1.5">
            {spectatorChatLogs.length === 0 && (
              <p className="text-text-muted text-xs text-center py-4">No spectator messages yet</p>
            )}
            {spectatorChatLogs.map((log, i) => (
              <div key={i} className="px-2 py-1 rounded-lg bg-[#6366f1]/10">
                <span className="text-xs font-bold text-[#a5b4fc]">{log.playerName}: </span>
                <span className="text-xs text-text">{log.message}</span>
              </div>
            ))}
          </div>
          <SpectatorChatInput
            onSend={(text) => sendChat(text)}
            onPreset={(preset) => sendChat(undefined, preset)}
            cooldown={cooldown}
            cooldownTime={cooldownTime}
            sending={sending}
          />
        </div>
      </div>

      {/* Mobile spectator chat button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <button
          onClick={() => {
            setShowChat(!showChat);
            if (!showChat) setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="w-12 h-12 rounded-full bg-[#6366f1]/80 border border-[#6366f1] flex items-center justify-center text-lg shadow-lg active:scale-95 transition-transform"
        >
          👁
        </button>

        <AnimatePresence>
          {showChat && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowChat(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full right-0 mb-2 w-72 bg-surface border border-[#6366f1]/30 rounded-xl shadow-xl z-30 overflow-hidden"
              >
                <div className="p-2 border-b border-border/50">
                  <div className="text-[10px] uppercase font-bold text-[#a5b4fc]/60 tracking-wider px-1 mb-1.5">Spectator Chat</div>
                  <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                    {spectatorChatLogs.slice(-10).map((log, i) => (
                      <div key={i} className="px-2 py-0.5 rounded bg-[#6366f1]/10 text-xs">
                        <span className="font-bold text-[#a5b4fc]">{log.playerName}: </span>
                        <span className="text-text">{log.message}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {SPECTATOR_PRESETS.map(preset => (
                      <motion.button
                        key={preset}
                        whileTap={{ scale: 0.95 }}
                        disabled={cooldown || sending}
                        onClick={() => sendChat(undefined, preset)}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium bg-surface-light/60 hover:bg-[#6366f1]/20 active:bg-[#6366f1]/30 text-text-muted hover:text-text transition-colors disabled:opacity-40 truncate"
                      >
                        {preset}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = message.trim();
                    if (text) sendChat(text);
                  }}
                  className="p-2 flex gap-1.5"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={100}
                    placeholder={cooldown ? `Wait ${cooldownTime}s...` : 'Chat as spectator...'}
                    disabled={cooldown || sending}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-light/80 border border-border text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-[#6366f1] disabled:opacity-40"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || cooldown || sending}
                    className="px-3 py-2 rounded-lg bg-[#6366f1] text-white text-sm font-bold disabled:opacity-30 shrink-0"
                  >
                    {sending ? '...' : '→'}
                  </button>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SpectatorChatInput({
  onSend,
  onPreset,
  cooldown,
  cooldownTime,
  sending,
}: {
  onSend: (text: string) => void;
  onPreset: (preset: string) => void;
  cooldown: boolean;
  cooldownTime: number;
  sending: boolean;
}) {
  const [message, setMessage] = useState('');

  return (
    <div className="border-t border-white/5">
      <div className="p-2 grid grid-cols-2 gap-1">
        {SPECTATOR_PRESETS.slice(0, 4).map(preset => (
          <motion.button
            key={preset}
            whileTap={{ scale: 0.95 }}
            disabled={cooldown || sending}
            onClick={() => onPreset(preset)}
            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-surface-light/60 hover:bg-[#6366f1]/20 text-text-muted hover:text-text transition-colors disabled:opacity-40 truncate"
          >
            {preset}
          </motion.button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = message.trim();
          if (text) {
            onSend(text);
            setMessage('');
          }
        }}
        className="p-2 pt-0 flex gap-1.5"
      >
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={100}
          placeholder={cooldown ? `Wait ${cooldownTime}s...` : 'Chat as spectator...'}
          disabled={cooldown || sending}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-light/80 border border-border text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-[#6366f1] disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!message.trim() || cooldown || sending}
          className="px-3 py-2 rounded-lg bg-[#6366f1] text-white text-sm font-bold disabled:opacity-30 shrink-0"
        >
          {sending ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}

function MobileLogToggle({ logs }: { logs: GameLog[] }) {
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="lg:hidden w-full max-w-lg">
      <button onClick={() => setShowLog(!showLog)} className="text-xs text-text-muted hover:text-accent transition-colors">
        {showLog ? 'Hide Log ▲' : `Game Log (${logs.length}) ▼`}
      </button>
      <AnimatePresence>
        {showLog && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
            <GameLogComponent logs={logs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
