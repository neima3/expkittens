'use client';

import { motion } from 'framer-motion';
import type { Card, CardType } from '@/types/game';
import { CARD_INFO } from '@/types/game';

interface GameCardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  index?: number;
  glowPlayable?: boolean;
}

const sizeMap = {
  sm: { w: 'w-12', h: 'h-[68px]', emoji: 'text-base', name: 'text-[7px]', r: 'rounded-lg', icon: 18 },
  md: { w: 'w-[72px]', h: 'h-[100px]', emoji: 'text-2xl', name: 'text-[9px]', r: 'rounded-xl', icon: 28 },
  lg: { w: 'w-24', h: 'h-[136px]', emoji: 'text-4xl', name: 'text-xs', r: 'rounded-2xl', icon: 36 },
};

// CSS patterns per card type
function getCardPattern(type: CardType): string {
  switch (type) {
    case 'exploding_kitten':
      return 'radial-gradient(circle at 30% 30%, #ff6644 0%, #ff2200 40%, #aa0000 100%)';
    case 'defuse':
      return 'linear-gradient(135deg, #22aa44 0%, #44dd66 50%, #22aa44 100%)';
    case 'attack':
      return 'linear-gradient(135deg, #cc4400 0%, #ff8800 40%, #ffaa33 100%)';
    case 'skip':
      return 'linear-gradient(135deg, #2244bb 0%, #4488ff 50%, #66aaff 100%)';
    case 'favor':
      return 'linear-gradient(135deg, #7722cc 0%, #aa44ff 50%, #cc77ff 100%)';
    case 'shuffle':
      return 'linear-gradient(135deg, #118888 0%, #22cccc 50%, #44eedd 100%)';
    case 'see_the_future':
      return 'linear-gradient(135deg, #aa1166 0%, #ff44aa 40%, #ff88cc 100%)';
    case 'nope':
      return 'linear-gradient(135deg, #444466 0%, #666688 50%, #8888aa 100%)';
    case 'taco_cat':
      return 'linear-gradient(135deg, #cc9900 0%, #ffcc00 50%, #ffdd44 100%)';
    case 'rainbow_cat':
      return 'linear-gradient(135deg, #ff4488 0%, #ff88aa 30%, #ffaa44 60%, #44ddaa 100%)';
    case 'beard_cat':
      return 'linear-gradient(135deg, #663311 0%, #995522 50%, #bb7744 100%)';
    case 'cattermelon':
      return 'linear-gradient(135deg, #118822 0%, #22cc44 40%, #ff4466 100%)';
    case 'potato_cat':
      return 'linear-gradient(135deg, #aa8855 0%, #ddbb88 50%, #ccaa66 100%)';
  }
}

export default function GameCard({
  card,
  onClick,
  selected,
  disabled,
  size = 'md',
  faceDown,
  index = 0,
  glowPlayable,
}: GameCardProps) {
  const s = sizeMap[size];
  const info = CARD_INFO[card.type];

  if (faceDown || card.id === 'hidden') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className={`${s.w} ${s.h} ${s.r} border-2 border-[#444466] flex items-center justify-center shadow-lg flex-shrink-0`}
        style={{
          background: 'repeating-linear-gradient(45deg, #1e1e3a, #1e1e3a 4px, #252548 4px, #252548 8px)',
        }}
      >
        <div className="text-xl opacity-30">🐱</div>
      </motion.div>
    );
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, y: -30 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, delay: index * 0.03 }}
      whileHover={!disabled ? { y: -10, scale: 1.08, zIndex: 10 } : undefined}
      whileTap={!disabled ? { scale: 0.93 } : undefined}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`${s.w} ${s.h} ${s.r} relative flex flex-col items-center justify-center border-2 transition-all shadow-lg flex-shrink-0 overflow-hidden
        ${selected ? 'border-white ring-2 ring-white/40 -translate-y-3 z-10' : 'border-white/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl'}
        ${glowPlayable && !disabled && !selected ? 'animate-pulse-glow' : ''}
      `}
      style={{
        background: getCardPattern(card.type),
      }}
    >
      {/* Inner glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none" />

      {/* Decorative corner dots */}
      <div className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-white/30" />
      <div className="absolute bottom-1 right-1.5 w-1 h-1 rounded-full bg-white/30" />

      {/* Card content */}
      <span className={`${s.emoji} drop-shadow-lg relative z-[1]`}>
        {info.emoji}
      </span>
      <span
        className={`${s.name} font-extrabold text-center leading-tight px-1 text-white drop-shadow-md relative z-[1] mt-0.5`}
      >
        {info.name}
      </span>

      {/* Selected checkmark */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center z-20 shadow-md"
        >
          <span className="text-xs text-black font-bold">✓</span>
        </motion.div>
      )}
    </motion.button>
  );
}
