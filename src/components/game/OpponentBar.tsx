'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/types/game';

const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'];

interface OpponentBarProps {
  players: Player[];
  currentPlayerId: string;
  myId: string;
  onPlayerClick?: (playerId: string) => void;
  selectablePlayerIds?: string[];
}

export default function OpponentBar({
  players,
  currentPlayerId,
  myId,
  onPlayerClick,
  selectablePlayerIds,
}: OpponentBarProps) {
  const opponents = players.filter(p => p.id !== myId);

  return (
    <div className="flex gap-2 md:gap-3 overflow-x-auto px-2 py-1">
      {opponents.map(player => {
        const isCurrent = player.id === currentPlayerId;
        const isSelectable = selectablePlayerIds?.includes(player.id);

        return (
          <motion.button
            key={player.id}
            whileHover={isSelectable ? { scale: 1.05 } : undefined}
            whileTap={isSelectable ? { scale: 0.95 } : undefined}
            onClick={() => isSelectable && onPlayerClick?.(player.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all min-w-fit
              ${!player.isAlive ? 'opacity-45 border-danger/35 bg-danger/10' : ''}
              ${isCurrent && player.isAlive ? 'border-accent bg-accent/16 animate-pulse-glow' : 'border-border bg-surface-light/80'}
              ${isSelectable ? 'cursor-pointer border-warning hover:border-accent' : 'cursor-default'}
            `}
            disabled={!isSelectable}
          >
            <span className="text-2xl">{AVATARS[player.avatar] || '😼'}</span>
            <div className="text-left">
              <div className={`text-sm font-bold leading-none ${!player.isAlive ? 'line-through' : ''}`}>
                {player.name}
                {player.isAI && <span className="text-text-muted text-xs ml-1">🤖</span>}
              </div>
              <div className="text-xs text-text-muted">
                {player.isAlive
                  ? `${player.hand.length} cards`
                  : '💀 Exploded'}
              </div>
            </div>
            {isCurrent && player.isAlive && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-accent ml-1"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
