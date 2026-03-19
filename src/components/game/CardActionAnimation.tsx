'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { CardType } from '@/types/game';

export type CardActionType = CardType | 'draw' | 'cat_combo';

export interface CardAction {
  type: CardActionType;
  actorName: string;
  /** For cat combos, how many were played */
  comboCount?: 2 | 3;
}

interface Props {
  action: CardAction | null;
  onDone: () => void;
}

const DURATION_MS: Partial<Record<CardActionType, number>> = {
  nope: 1500,
  attack: 1600,
  skip: 1300,
  shuffle: 1900,
  see_the_future: 1700,
  favor: 1400,
  defuse: 1800,
  draw: 900,
  cat_combo: 1300,
  exploding_kitten: 1200,
};
const DEFAULT_DURATION = 1400;

// ── Individual animation scenes ──────────────────────────────────────────────

function NopeScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <motion.div
        initial={{ y: -280, rotate: -18, scale: 1.8 }}
        animate={{ y: 0, rotate: [-18, 10, -5, 2, 0], scale: [1.8, 0.85, 1.1, 1] }}
        transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="relative"
      >
        {/* Stamp text */}
        <span
          className="block text-[100px] md:text-[130px] font-black leading-none tracking-tighter uppercase"
          style={{
            color: '#ff1a1a',
            textShadow: '6px 6px 0 #7a0000, 0 0 50px rgba(255,26,26,0.5)',
            WebkitTextStroke: '3px #7a0000',
            fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          }}
        >
          NOPE
        </span>

        {/* Stamp border ring */}
        <motion.div
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [1.15, 1.05, 1.05, 1] }}
          transition={{ duration: 1.5, times: [0, 0.15, 0.65, 1] }}
          className="absolute inset-[-8px] rounded-2xl border-[6px] border-[#ff1a1a]/80 pointer-events-none"
          style={{ boxShadow: '0 0 30px rgba(255,26,26,0.6), inset 0 0 20px rgba(255,26,26,0.15)' }}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, times: [0, 0.25, 0.7, 1] }}
        className="text-white/80 text-base md:text-lg font-semibold"
      >
        {actor} played Nope!
      </motion.p>
    </div>
  );
}

function AttackScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative flex items-center justify-center">
        <motion.span
          initial={{ scale: 0, rotate: -40, x: -60, y: -60 }}
          animate={{ scale: [0, 1.6, 1.1], rotate: [-40, 10, 0], x: [-60, 0, 0], y: [-60, 0, 0] }}
          transition={{ duration: 0.35, ease: 'backOut' }}
          className="text-[90px] md:text-[110px] drop-shadow-[0_0_40px_rgba(255,160,0,0.9)]"
        >
          ⚡
        </motion.span>

        {/* Shockwave ring */}
        <motion.div
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="absolute w-24 h-24 rounded-full border-4 border-orange-400/60 pointer-events-none"
        />
      </div>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.15, 0.55, 1], delay: 0.1 }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#ff6600',
          textShadow: '0 0 30px rgba(255,100,0,0.8), 4px 4px 0 #7a2a00',
          WebkitTextStroke: '2px #7a2a00',
        }}
        className="text-5xl md:text-7xl font-black uppercase tracking-tight"
      >
        ATTACK!
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.25, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base font-semibold"
      >
        {actor} attacks — next player draws twice!
      </motion.p>
    </div>
  );
}

function SkipScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative flex items-center gap-4 overflow-hidden">
        <motion.span
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: [-80, 0, 100], opacity: [0, 1, 0] }}
          transition={{ duration: 0.7, times: [0, 0.35, 1], ease: 'easeInOut' }}
          className="text-[70px] md:text-[90px]"
        >
          🃏
        </motion.span>
        <motion.span
          initial={{ x: -40, opacity: 0, scaleX: 0.3 }}
          animate={{ x: [-40, 0, 80], opacity: [0, 1, 0], scaleX: [0.3, 1, 0.5] }}
          transition={{ duration: 0.8, times: [0, 0.3, 1], delay: 0.05 }}
          className="text-[50px] md:text-[60px]"
        >
          →
        </motion.span>
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.3, times: [0, 0.2, 0.55, 1] }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#3388ff',
          textShadow: '0 0 20px rgba(51,136,255,0.8), 3px 3px 0 #003388',
          WebkitTextStroke: '2px #003388',
        }}
        className="text-4xl md:text-6xl font-black uppercase tracking-tight"
      >
        SKIPPED!
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.3, times: [0, 0.3, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} skips their turn
      </motion.p>
    </div>
  );
}

function ShuffleScene({ actor }: { actor: string }) {
  const cards = [0, 1, 2, 3, 4];
  const angles = [-80, -35, 0, 35, 80];
  const radii = [120, 90, 110, 90, 120];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {cards.map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
            animate={{
              x: [0, Math.sin((angles[i] * Math.PI) / 180) * radii[i], 0],
              y: [0, -Math.cos((angles[i] * Math.PI) / 180) * radii[i], 0],
              rotate: [0, angles[i] * 1.5, i % 2 === 0 ? -5 : 5],
              opacity: [1, 0.9, 0],
              scale: [1, 0.9, 0.6],
            }}
            transition={{ duration: 0.9, delay: i * 0.04, ease: 'easeInOut' }}
            className="absolute w-12 h-16 rounded-lg flex items-center justify-center text-2xl"
            style={{
              background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
              border: '1px solid #3b2d5c',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            }}
          >
            🐾
          </motion.div>
        ))}
        {/* Deck re-forming */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.6, delay: 0.7, ease: 'backOut' }}
          className="w-14 h-20 rounded-xl flex items-center justify-center text-3xl"
          style={{
            background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
            border: '1px solid #3b2d5c',
            boxShadow: '0 0 20px rgba(170,51,255,0.4)',
          }}
        >
          🎴
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.1, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.9, times: [0, 0.2, 0.55, 1] }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#aa33ff',
          textShadow: '0 0 25px rgba(170,51,255,0.8), 3px 3px 0 #4a0080',
          WebkitTextStroke: '2px #4a0080',
        }}
        className="text-4xl md:text-6xl font-black uppercase tracking-tight"
      >
        SHUFFLED!
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.9, times: [0, 0.25, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} shuffled the deck
      </motion.p>
    </div>
  );
}

function SeeFutureScene({ actor }: { actor: string }) {
  const cardOffsets = [
    { rotate: -18, x: -52, y: 8 },
    { rotate: 0, x: 0, y: -10 },
    { rotate: 18, x: 52, y: 8 },
  ];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative flex items-end justify-center h-36 w-52">
        {cardOffsets.map(({ rotate, x, y }, i) => (
          <motion.div
            key={i}
            initial={{ y: 80, rotate: 0, opacity: 0, scale: 0.6 }}
            animate={{
              y: [80, y - 10, y],
              rotate: [0, rotate * 1.3, rotate],
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.05, 1, 0.8],
            }}
            transition={{
              duration: 1.7,
              times: [0, 0.25, 0.6, 1],
              delay: i * 0.07,
              ease: 'easeOut',
            }}
            className="absolute w-[60px] h-[84px] rounded-xl flex items-center justify-center text-3xl"
            style={{
              background: 'linear-gradient(155deg, #2e0840 0%, #170221 100%)',
              border: `2px solid #ff33d4`,
              boxShadow: '0 0 18px rgba(255,51,212,0.55), 0 4px 8px rgba(0,0,0,0.5)',
              x,
              transformOrigin: 'bottom center',
            }}
          >
            🔮
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.7, times: [0, 0.2, 0.55, 1], delay: 0.15 }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#ff33d4',
          textShadow: '0 0 25px rgba(255,51,212,0.8), 3px 3px 0 #7a0066',
          WebkitTextStroke: '2px #7a0066',
        }}
        className="text-3xl md:text-5xl font-black uppercase tracking-tight text-center"
      >
        SEES THE FUTURE
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.7, times: [0, 0.3, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} peeks at the top 3 cards
      </motion.p>
    </div>
  );
}

function DefuseScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative flex items-center justify-center gap-2">
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.3, 1], rotate: [-20, 5, 0] }}
          transition={{ duration: 0.35, ease: 'backOut' }}
          className="text-[60px] md:text-[80px] drop-shadow-[0_0_20px_rgba(255,80,80,0.6)]"
        >
          💣
        </motion.span>

        {/* Defuse cross over bomb */}
        <motion.span
          initial={{ scale: 0, x: -30 }}
          animate={{ scale: [0, 1.5, 1.1], x: [-30, 0, -5], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, times: [0, 0.2, 0.55, 1], delay: 0.25 }}
          className="text-[55px] md:text-[70px] drop-shadow-[0_0_30px_rgba(43,212,124,0.8)]"
        >
          🛡️
        </motion.span>
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, times: [0, 0.2, 0.55, 1] }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#2bd47c',
          textShadow: '0 0 25px rgba(43,212,124,0.8), 3px 3px 0 #0a4a24',
          WebkitTextStroke: '2px #0a4a24',
        }}
        className="text-4xl md:text-6xl font-black uppercase tracking-tight"
      >
        DEFUSED!
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, times: [0, 0.25, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} defused the Exploding Kitten!
      </motion.p>
    </div>
  );
}

function FavorScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex items-center gap-3">
        <motion.span
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: [-30, 0, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1] }}
          className="text-[55px]"
        >
          🃏
        </motion.span>

        {/* Coins floating across */}
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            initial={{ x: -20, y: 10, opacity: 0, scale: 0.5 }}
            animate={{
              x: [-20, 20, 40],
              y: [10, -15 + i * 5, 10],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: 'easeInOut' }}
            className="text-2xl"
          >
            💰
          </motion.span>
        ))}

        <motion.span
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: [30, 0, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1] }}
          className="text-[55px]"
        >
          🃏
        </motion.span>
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.1, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.4, times: [0, 0.2, 0.55, 1] }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#2fd19f',
          textShadow: '0 0 20px rgba(47,209,159,0.7), 3px 3px 0 #0a4a35',
          WebkitTextStroke: '2px #0a4a35',
        }}
        className="text-4xl md:text-6xl font-black uppercase tracking-tight"
      >
        FAVOR!
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.4, times: [0, 0.3, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} called in a favor
      </motion.p>
    </div>
  );
}

function DrawScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* 3D card flip */}
      <motion.div
        style={{ perspective: 600 }}
        className="relative w-[74px] h-[104px]"
      >
        <motion.div
          initial={{ rotateY: 0, scale: 0.8 }}
          animate={{ rotateY: [0, 90, 180], scale: [0.8, 0.9, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.9, times: [0, 0.4, 0.7, 1], ease: 'easeInOut' }}
          className="absolute inset-0 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
            border: '1px solid #3b2d5c',
            boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
            backfaceVisibility: 'hidden',
          }}
        >
          <span className="text-4xl opacity-20">🐾</span>
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.9, times: [0, 0.3, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} drew a card
      </motion.p>
    </div>
  );
}

function CatComboScene({ actor, comboCount }: { actor: string; comboCount?: 2 | 3 }) {
  const count = comboCount ?? 2;
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ y: 40, opacity: 0, rotate: -20 + i * 20 }}
            animate={{ y: [40, -10, 0], opacity: [0, 1, 1, 0], rotate: [-20 + i * 20, 5 - i * 5, 0] }}
            transition={{ duration: 1.3, times: [0, 0.25, 0.6, 1], delay: i * 0.06 }}
            className="text-[60px] md:text-[75px] drop-shadow-[0_0_15px_rgba(255,184,51,0.6)]"
          >
            🐱
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.3, times: [0, 0.2, 0.55, 1] }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#ffb833',
          textShadow: '0 0 20px rgba(255,184,51,0.7), 3px 3px 0 #7a5000',
          WebkitTextStroke: '2px #7a5000',
        }}
        className="text-4xl md:text-6xl font-black uppercase tracking-tight"
      >
        {count === 3 ? 'TRIPLE THREAT!' : 'CAT COMBO!'}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.3, times: [0, 0.3, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} played a {count === 3 ? 'triple' : 'pair'}
      </motion.p>
    </div>
  );
}

function ExplodingKittenScene({ actor }: { actor: string }) {
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [0, 1.8, 1.4], rotate: [-30, 15, -5], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.2, times: [0, 0.15, 0.5, 1] }}
        className="text-[100px] md:text-[120px] drop-shadow-[0_0_40px_rgba(255,51,51,0.9)]"
      >
        😿
      </motion.span>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.2, times: [0, 0.2, 0.55, 1] }}
        style={{
          fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
          color: '#ff3355',
          textShadow: '0 0 30px rgba(255,51,85,0.9), 4px 4px 0 #7a0020',
          WebkitTextStroke: '2px #7a0020',
        }}
        className="text-4xl md:text-6xl font-black uppercase tracking-tight text-center"
      >
        EXPLODING KITTEN!
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.2, times: [0, 0.3, 0.65, 1] }}
        className="text-white/70 text-sm md:text-base"
      >
        {actor} drew the Exploding Kitten!
      </motion.p>
    </div>
  );
}

// ── Reduced-motion fallback ───────────────────────────────────────────────────

const CARD_LABELS: Partial<Record<CardActionType, string>> = {
  nope: 'NOPE!',
  attack: 'ATTACK!',
  skip: 'SKIPPED!',
  shuffle: 'SHUFFLE!',
  see_the_future: 'SEES THE FUTURE',
  defuse: 'DEFUSED!',
  favor: 'FAVOR!',
  draw: 'DREW A CARD',
  cat_combo: 'CAT COMBO!',
  exploding_kitten: 'EXPLODING KITTEN!',
};

function ReducedScene({ action }: { action: CardAction }) {
  const label = CARD_LABELS[action.type] ?? action.type.replace(/_/g, ' ').toUpperCase();
  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <p className="text-white font-black text-3xl">{label}</p>
      <p className="text-white/60 text-sm">{action.actorName}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CardActionAnimation({ action, onDone }: Props) {
  const prefersReduced = useReducedMotion();
  const duration = action ? (DURATION_MS[action.type] ?? DEFAULT_DURATION) : 0;

  // Auto-dismiss after animation duration
  useEffect(() => {
    if (!action) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [action, duration, onDone]);

  function renderScene(a: CardAction) {
    if (prefersReduced) return <ReducedScene action={a} />;

    switch (a.type) {
      case 'nope':        return <NopeScene actor={a.actorName} />;
      case 'attack':      return <AttackScene actor={a.actorName} />;
      case 'skip':        return <SkipScene actor={a.actorName} />;
      case 'shuffle':     return <ShuffleScene actor={a.actorName} />;
      case 'see_the_future': return <SeeFutureScene actor={a.actorName} />;
      case 'defuse':      return <DefuseScene actor={a.actorName} />;
      case 'favor':       return <FavorScene actor={a.actorName} />;
      case 'draw':        return <DrawScene actor={a.actorName} />;
      case 'cat_combo':   return <CatComboScene actor={a.actorName} comboCount={a.comboCount} />;
      case 'exploding_kitten': return <ExplodingKittenScene actor={a.actorName} />;
      default:            return <ReducedScene action={a} />;
    }
  }

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          key={`${action.type}-${action.actorName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          // Click to dismiss early
          onClick={onDone}
          className="fixed inset-0 z-[48] flex items-center justify-center pointer-events-auto cursor-pointer"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(5,3,15,0.65) 0%, rgba(5,3,15,0.85) 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          {renderScene(action)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
