'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_PRESETS = [
  'GG', 'Well played', 'Good luck', 'Nice one!',
  'Nooo!', 'Oh no...', 'Wow', 'Hurry up!',
];

interface ChatPanelProps {
  gameId: string;
  playerId: string;
  disabled?: boolean;
}

export default function ChatPanel({ gameId, playerId, disabled }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [sending, setSending] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (sending || cooldown || disabled) return;
    setSending(true);
    try {
      const body: Record<string, string> = { playerId };
      if (preset) {
        body.preset = preset;
      } else if (text) {
        body.message = text;
      } else {
        return;
      }

      const res = await fetch(`/api/games/${gameId}/chat`, {
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
  }, [gameId, playerId, sending, cooldown, disabled, startCooldown]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (text) sendChat(text);
  }, [message, sendChat]);

  const handlePreset = useCallback((preset: string) => {
    sendChat(undefined, preset);
  }, [sendChat]);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="w-10 h-10 rounded-lg bg-surface-light/85 border border-border flex items-center justify-center text-sm active:border-accent active:bg-surface-light transition-colors"
        title="Chat"
        aria-label="Open chat"
      >
        💬
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full right-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-30 overflow-hidden"
            >
              {/* Quick presets */}
              <div className="p-2 border-b border-border/50">
                <div className="text-[10px] uppercase font-bold text-text-muted/60 tracking-wider px-1 mb-1.5">Quick Chat</div>
                <div className="grid grid-cols-2 gap-1">
                  {QUICK_PRESETS.map(preset => (
                    <motion.button
                      key={preset}
                      whileTap={{ scale: 0.95 }}
                      disabled={cooldown || sending}
                      onClick={() => handlePreset(preset)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium bg-surface-light/60 hover:bg-surface-light active:bg-accent/20 text-text-muted hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed truncate"
                    >
                      {preset}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <form onSubmit={handleSubmit} className="p-2 flex gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={100}
                  placeholder={cooldown ? `Wait ${cooldownTime}s...` : 'Type a message...'}
                  disabled={cooldown || sending}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-light/80 border border-border text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || cooldown || sending}
                  className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {sending ? '...' : '→'}
                </button>
              </form>

              {cooldown && (
                <div className="px-3 pb-2">
                  <div className="h-1 rounded-full bg-surface-light overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: cooldownTime, ease: 'linear' }}
                      className="h-full bg-accent/60 rounded-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
