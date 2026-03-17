'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CardType } from '@/types/game';
import { CARD_INFO, CAT_CARD_TYPES, ACTION_CARD_TYPES } from '@/types/game';
import { CardIllustration } from './CardIllustrations';

interface CardPreviewOverlayProps {
  cardType: CardType | null;
}

function getCardCategory(type: CardType): string {
  if (type === 'exploding_kitten') return 'DANGER';
  if (type === 'defuse') return 'LIFESAVER';
  if (CAT_CARD_TYPES.includes(type)) return 'CAT CARD';
  if (type === 'nope') return 'COUNTER';
  return 'ACTION';
}

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

function getCatPairTip(type: CardType): string | null {
  if (!CAT_CARD_TYPES.includes(type)) return null;
  return 'Play 2 matching cats to steal a random card. Play 3 to name the card you want.';
}

export default function CardPreviewOverlay({ cardType }: CardPreviewOverlayProps) {
  return (
    <AnimatePresence>
      {cardType && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Dimmed backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <PreviewCard cardType={cardType} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PreviewCard({ cardType }: { cardType: CardType }) {
  const info = CARD_INFO[cardType];
  const style = getCardStyle(cardType);
  const category = getCardCategory(cardType);
  const catTip = getCatPairTip(cardType);

  return (
    <motion.div
      initial={{ scale: 0.85, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.85, y: 20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative flex flex-col items-center gap-4 z-10"
    >
      {/* Large card */}
      <div
        className="relative w-44 h-[248px] rounded-3xl flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: style.bg,
          border: `2px solid ${style.border}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${style.glow}55, inset 0 1px 2px rgba(255,255,255,0.2)`,
        }}
      >
        {/* Lighting overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

        {/* Corner dots */}
        <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-white/20" />
        <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-white/20" />

        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${style.glow}22 0%, transparent 70%)` }}
        />

        {/* Card Illustration */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <CardIllustration type={cardType} className="w-36 h-52 opacity-80" />
        </div>

        {/* Category badge */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] z-20"
          style={{
            background: `${style.border}33`,
            color: style.border,
            border: `1px solid ${style.border}66`,
          }}
        >
          {category}
        </div>

        {/* Emoji */}
        <span className="text-6xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] relative z-10 mt-4">
          {info.emoji}
        </span>

        {/* Name */}
        <span
          className="text-sm font-black text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] relative z-10 mt-2 uppercase tracking-wider text-center px-2"
        >
          {info.name}
        </span>
      </div>

      {/* Description panel */}
      <div
        className="max-w-[220px] rounded-2xl px-4 py-3 text-center"
        style={{
          background: `linear-gradient(145deg, ${style.border}18, ${style.border}08, rgba(0,0,0,0.6))`,
          border: `1px solid ${style.border}44`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <p className="text-sm text-white/90 leading-relaxed">{info.description}</p>
        {catTip && (
          <p className="text-xs text-white/50 mt-2 leading-relaxed italic">{catTip}</p>
        )}
      </div>

      {/* Dismiss hint */}
      <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
        Release to dismiss
      </p>
    </motion.div>
  );
}
