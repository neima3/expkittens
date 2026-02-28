'use client';

import { memo } from 'react';
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
  md: { w: 'w-[74px]', h: 'h-[104px]', emoji: 'text-2xl', name: 'text-[9px]', r: 'rounded-xl', icon: 28 },
  lg: { w: 'w-24', h: 'h-[136px]', emoji: 'text-4xl', name: 'text-xs', r: 'rounded-2xl', icon: 36 },
};

// CSS patterns per card type
function getCardStyle(type: CardType) {
  switch (type) {
    case 'exploding_kitten':
      return { bg: 'radial-gradient(circle at 50% 0%, #3a0000 0%, #1a0000 70%, #000 100%)', border: '#ff2200', glow: '#ff2200' };
    case 'defuse':
      return { bg: 'linear-gradient(145deg, #0f381f 0%, #0a2614 60%, #05140a 100%)', border: '#2bd47c', glow: '#2bd47c' };
    case 'attack':
      return { bg: 'linear-gradient(145deg, #4a1c0b 0%, #2a0c02 60%, #170400 100%)', border: '#ff5f2e', glow: '#ff5f2e' };
    case 'skip':
      return { bg: 'linear-gradient(145deg, #0a2a4f 0%, #05162a 60%, #020b17 100%)', border: '#3388ff', glow: '#3388ff' };
    case 'favor':
      return { bg: 'linear-gradient(145deg, #103b42 0%, #071f24 60%, #031114 100%)', border: '#2fd19f', glow: '#2fd19f' };
    case 'shuffle':
      return { bg: 'linear-gradient(145deg, #2a0a2f 0%, #130317 60%, #0b010d 100%)', border: '#aa33ff', glow: '#aa33ff' };
    case 'see_the_future':
      return { bg: 'linear-gradient(145deg, #2e0840 0%, #170221 60%, #0c0012 100%)', border: '#ff33d4', glow: '#ff33d4' };
    case 'nope':
      return { bg: 'linear-gradient(145deg, #282a35 0%, #12141c 60%, #080a0f 100%)', border: '#7580a0', glow: '#7580a0' };
    case 'taco_cat':
      return { bg: 'linear-gradient(145deg, #40360a 0%, #211b03 60%, #120e01 100%)', border: '#ffb833', glow: '#ffb833' };
    case 'rainbow_cat':
      return { bg: 'linear-gradient(145deg, #4a0d2f 0%, #210314 60%, #12000a 100%)', border: '#ff4488', glow: '#ff4488' };
    case 'beard_cat':
      return { bg: 'linear-gradient(145deg, #30180a 0%, #170a02 60%, #0c0400 100%)', border: '#d48844', glow: '#d48844' };
    case 'cattermelon':
      return { bg: 'linear-gradient(145deg, #183818 0%, #0a1f0a 60%, #041204 100%)', border: '#44cc66', glow: '#44cc66' };
    case 'potato_cat':
      return { bg: 'linear-gradient(145deg, #382c16 0%, #1c1407 60%, #0f0a02 100%)', border: '#ccaa66', glow: '#ccaa66' };
    default:
      return { bg: 'linear-gradient(145deg, #1f183b 0%, #0d0a1b 100%)', border: '#443468', glow: '#443468' };
  }
}

export default memo(function GameCard({
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
  const style = getCardStyle(card.type);

  if (faceDown || card.id === 'hidden') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className={`${s.w} ${s.h} ${s.r} flex items-center justify-center shadow-xl flex-shrink-0 relative overflow-hidden`}
        style={{
          background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          border: '1px solid #3b2d5c'
        }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h12v12H0V0zm6 6h6v6H6V6zM0 6h6v6H0V6zm6-6h6v6H6V0z\' fill=\'%23ffffff\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] pointer-events-none" />
        <div className="text-2xl opacity-20 relative z-10 drop-shadow-md filter sepia">🐾</div>
      </motion.div>
    );
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: selected ? -16 : 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, y: -30 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: index * 0.02 }}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`${s.w} ${s.h} ${s.r} game-card-layer relative flex flex-col items-center justify-center transition-all flex-shrink-0 overflow-hidden group
        ${selected ? 'z-20' : 'z-10'}
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale-[0.3]' : 'cursor-pointer hover:-translate-y-2'}
      `}
      style={{
        background: style.bg,
        boxShadow: selected 
          ? `0 16px 32px rgba(0, 0, 0, 0.8), 0 0 20px ${style.glow}88, inset 0 1px 1px rgba(255, 255, 255, 0.3)`
          : glowPlayable && !disabled 
            ? `0 8px 16px rgba(0, 0, 0, 0.6), 0 0 12px ${style.glow}44, inset 0 1px 1px rgba(255, 255, 255, 0.15)`
            : '0 8px 16px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        border: selected ? `2px solid ${style.border}` : `1px solid ${style.border}88`,
      }}
    >
      {/* Dynamic lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      {/* Decorative corner dots */}
      <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-white/20" />
      <div className="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-white/20" />

      {/* Glow effect on hover (for non-touch devices) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
           style={{ background: `radial-gradient(circle at center, ${style.glow}33 0%, transparent 70%)` }} />

      {/* Card content */}
      <span className={`${s.emoji} drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] relative z-10 transition-transform group-hover:scale-110`}>
        {info.emoji}
      </span>
      <span
        className={`${s.name} font-black text-center leading-tight px-1 text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10 mt-1 uppercase tracking-wider`}
      >
        {info.name}
      </span>

      {/* Selected indicator ring */}
      {selected && (
        <motion.div
          layoutId="selected-ring"
          className="absolute inset-0 rounded-[inherit] border-[3px] pointer-events-none"
          style={{ borderColor: style.glow, opacity: 0.6 }}
        />
      )}
    </motion.button>
  );
})
