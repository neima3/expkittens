'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameLog as GameLogType } from '@/types/game';

interface GameLogProps {
  logs: GameLogType[];
  maxVisible?: number;
}

export default function GameLog({ logs, maxVisible = 50 }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = logs.slice(-maxVisible);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div
      ref={scrollRef}
      className="h-32 md:h-40 overflow-y-auto bg-surface/80 rounded-xl p-3 border border-border text-sm space-y-1 scroll-touch overscroll-contain"
    >
      <AnimatePresence initial={false}>
        {visible.map((log, i) => {
          const isChat = log.type === 'chat' || log.type === 'preset';
          const time = new Date(log.timestamp);
          const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return (
            <motion.div
              key={`${log.timestamp}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-2 px-2 py-0.5 rounded ${
                isChat
                  ? 'bg-accent/10 border-l-2 border-accent/40'
                  : i % 2 === 0 ? 'bg-surface-light/30' : ''
              }`}
            >
              <span className="text-[10px] text-text-muted/50 shrink-0 mt-0.5 font-mono">{timeStr}</span>
              {isChat ? (
                <span className="text-text">
                  <span className="font-bold text-accent/80">{log.playerName || 'Player'}</span>
                  <span className="text-text-muted/50 mx-1">:</span>
                  <span className={log.type === 'preset' ? 'italic text-text/80' : ''}>{log.message}</span>
                </span>
              ) : (
                <span className="text-text-muted">{log.message}</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
