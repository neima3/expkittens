'use client';

import { memo } from 'react';
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

export default memo(function OpponentBar({
  players,
  currentPlayerId,
  myId,
  onPlayerClick,
  selectablePlayerIds,
}: OpponentBarProps) {
  const opponents = players.filter(p => p.id !== myId);

  return (
    <div className="flex gap-2 md:gap-3 overflow-x-auto px-2 py-1 scroll-touch">
      {opponents.map(player => {
        const isCurrent = player.id === currentPlayerId;
        const isSelectable = selectablePlayerIds?.includes(player.id);

        return (
          <motion.button
            key={player.id}
            whileTap={isSelectable ? { scale: 0.95 } : undefined}
            onClick={() => isSelectable && onPlayerClick?.(player.id)}
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all min-w-fit min-h-[44px] relative overflow-hidden group
              ${!player.isAlive ? 'opacity-40 border-danger/30 bg-danger/5 grayscale' : ''}
              ${isCurrent && player.isAlive ? 'border-accent bg-accent/10 shadow-[0_0_16px_rgba(255,95,46,0.3)] z-10' : 'border-white/5 bg-[#1f183b]/60 hover:bg-[#1f183b]/80'}
              ${isSelectable ? 'cursor-pointer border-warning bg-warning/10 shadow-[0_0_12px_rgba(255,184,51,0.2)] hover:border-accent hover:shadow-[0_0_20px_rgba(255,95,46,0.4)]' : 'cursor-default'}
            `}
            disabled={!isSelectable}
          >
            {/* Background texture */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 12 12\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M0 0h12v12H0V0zm6 6h6v6H6V6zM0 6h6v6H0V6zm6-6h6v6H6V0z\\' fill=\\'%23ffffff\\' fill-opacity=\\'0.02\\' fill-rule=\\'evenodd\\'/%3E%3C/svg%3E')] pointer-events-none mix-blend-overlay" />

            <div className="relative">
              <span className="text-3xl drop-shadow-md">{AVATARS[player.avatar] || '😼'}</span>
              {isCurrent && player.isAlive && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-[#130f25] shadow-[0_0_8px_var(--color-accent)]"
                />
              )}
            </div>
            
            <div className="text-left relative z-10 pr-2">
              <div className={`text-[13px] font-black tracking-wide leading-none mb-1 text-white/95 ${!player.isAlive ? 'line-through text-danger/80' : ''}`}>
                {player.name}
                {player.isAI && <span className="text-text-muted text-[10px] ml-1.5 opacity-70">🤖</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {player.isAlive ? (
                  <>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded text-white/70">
                      {player.hand.length} <span className="opacity-50">CRDS</span>
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-danger font-bold uppercase tracking-widest bg-danger/10 px-1.5 py-0.5 rounded">
                    💀 DEAD
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
})
