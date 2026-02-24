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
}

const sizeClasses = {
  sm: 'w-14 h-20 text-lg rounded-lg',
  md: 'w-20 h-28 text-2xl rounded-xl',
  lg: 'w-24 h-34 text-3xl rounded-2xl',
};

export default function GameCard({
  card,
  onClick,
  selected,
  disabled,
  size = 'md',
  faceDown,
  index = 0,
}: GameCardProps) {
  const info = CARD_INFO[card.type];

  if (faceDown || card.id === 'hidden') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className={`${sizeClasses[size]} bg-gradient-to-br from-[#2a2a4a] to-[#1a1a3a] border-2 border-[#444466] flex items-center justify-center cursor-default shadow-lg`}
      >
        <div className="text-2xl opacity-40">🐱</div>
      </motion.div>
    );
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 30, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.04 }}
      whileHover={!disabled ? { y: -8, scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`${sizeClasses[size]} relative flex flex-col items-center justify-center gap-0.5 border-2 transition-all shadow-lg
        ${selected ? 'border-accent ring-2 ring-accent/50 -translate-y-3' : 'border-white/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
      `}
      style={{
        background: `linear-gradient(135deg, ${info.color}22, ${info.color}44)`,
        borderColor: selected ? undefined : `${info.color}66`,
      }}
    >
      <span className={size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'}>
        {info.emoji}
      </span>
      <span
        className={`font-bold text-center leading-tight px-1 ${
          size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs'
        }`}
        style={{ color: info.color }}
      >
        {info.name}
      </span>
    </motion.button>
  );
}
