'use client';

import { motion } from 'framer-motion';

function Shimmer() {
  return (
    <motion.div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
      animate={{ translateX: ['-100%', '100%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function OpponentSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/5 bg-[#1f183b]/60 min-w-fit min-h-[44px] relative overflow-hidden">
      <div className="w-10 h-10 rounded-full bg-surface-light animate-pulse" />
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-20 bg-surface-light animate-pulse rounded" />
        <div className="h-3 w-14 bg-surface-light/60 animate-pulse rounded" />
      </div>
    </div>
  );
}

function OpponentBarSkeleton() {
  return (
    <div className="flex gap-2 md:gap-3 overflow-x-auto px-2 py-1 scroll-touch">
      {[1, 2, 3].map(i => (
        <OpponentSkeleton key={i} />
      ))}
    </div>
  );
}

function DrawPileSkeleton() {
  return (
    <div className="relative w-24 h-[136px] md:w-28 md:h-40 rounded-2xl border border-white/10 bg-[#1f183b] flex flex-col items-center justify-center gap-1 overflow-hidden">
      <Shimmer />
      <span className="text-4xl opacity-30">🎴</span>
      <div className="h-3 w-14 bg-surface-light/60 animate-pulse rounded" />
    </div>
  );
}

function DiscardPileSkeleton() {
  return (
    <div className="relative w-24 h-[136px] md:w-28 md:h-40 rounded-2xl border-2 border-white/5 border-dashed bg-black/40 flex flex-col items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]">
      <span className="text-text-muted/30 text-xs font-bold uppercase tracking-wider">Discard</span>
      <div className="absolute -bottom-7 bg-surface-light/40 border border-white/5 px-3 py-1 rounded-full">
        <div className="h-3 w-12 bg-surface-light/60 animate-pulse rounded" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="w-20 h-28 md:w-24 md:h-32 rounded-xl bg-[#1f183b] border border-white/10 overflow-hidden relative animate-pulse">
      <Shimmer />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl opacity-20">🂠</span>
      </div>
    </div>
  );
}

function PlayerHandSkeleton() {
  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 px-2 bg-gradient-to-t from-[#0a0714] to-transparent scroll-touch lg:bg-transparent lg:overflow-visible">
      <div className="flex justify-center min-w-max px-6 pb-2 lg:px-0 lg:pb-6 gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="-mx-1 sm:-mx-1.5 lg:-mx-2">
            <div className="lg:scale-[1.3] lg:transform-gpu lg:transform-origin-bottom">
              <CardSkeleton />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface GameSkeletonProps {
  gameCode?: string | null;
  playerCount?: number;
}

export default function GameSkeleton({ gameCode, playerCount = 4 }: GameSkeletonProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#090714] relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-orange-900/10" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-none pt-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="h-5 w-24 bg-surface-light/40 animate-pulse rounded" />
            {gameCode && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-light/60 border border-border/50">
                <span className="text-xs text-text-muted font-bold">CODE</span>
                <span className="text-sm font-mono font-black text-accent">{gameCode}</span>
              </div>
            )}
          </div>
          <OpponentBarSkeleton />
        </div>

        <div className="flex-1 flex items-center justify-center gap-6 md:gap-10 px-4 py-8">
          <DrawPileSkeleton />
          <DiscardPileSkeleton />
        </div>

        <div className="flex-none">
          <div className="flex items-center justify-center gap-2 mb-2 px-3">
            <div className="h-4 w-48 bg-surface-light/40 animate-pulse rounded" />
          </div>
          <PlayerHandSkeleton />
        </div>
      </div>
    </div>
  );
}

export { OpponentBarSkeleton, DrawPileSkeleton, DiscardPileSkeleton, PlayerHandSkeleton };
