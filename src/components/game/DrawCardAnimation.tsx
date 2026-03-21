'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { CardType } from '@/types/game';
import { CARD_INFO } from '@/types/game';

export interface DrawAnimationState {
  isPlaying: boolean;
  phase: 'travel' | 'suspense' | 'reveal' | 'defuse' | 'none';
  drawnCardType: CardType | null;
  hasDefuse: boolean;
  actorName: string;
}

interface Props {
  state: DrawAnimationState;
  onDone: () => void;
  onDefusePlace: () => void;
  onExplode?: () => void;
  deckPosition?: { x: number; y: number };
  playerPosition?: { x: number; y: number };
}

const PHASE_DURATIONS = {
  travel: 600,
  suspense: 1200,
  reveal: 900,
  defuse: 2000,
};

function ReducedDrawAnimation({ cardType, actorName }: { cardType: CardType | null; actorName: string }) {
  const info = cardType ? CARD_INFO[cardType] : null;
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="w-[74px] h-[104px] rounded-xl flex items-center justify-center bg-surface-light border border-border">
        {info && <span className="text-4xl">{info.emoji}</span>}
      </div>
      <p className="text-white/80 text-base font-semibold">
        {actorName} drew {info?.name || 'a card'}
      </p>
    </div>
  );
}

function CardTravelAnimation({
  deckPos,
  playerPos,
  onComplete,
}: {
  deckPos: { x: number; y: number };
  playerPos: { x: number; y: number };
  onComplete: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onComplete, PHASE_DURATIONS.travel);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ x: deckPos.x, y: deckPos.y, scale: 0.8, rotate: -5 }}
      animate={{
        x: [(deckPos.x + playerPos.x) / 2, playerPos.x],
        y: [(deckPos.y + playerPos.y) / 2 - 100, playerPos.y],
        scale: [0.8, 1.1, 1],
        rotate: [-5, 5, 0],
      }}
      transition={{
        duration: PHASE_DURATIONS.travel / 1000,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="fixed z-[60] pointer-events-none"
      style={{ transformOrigin: 'center center' }}
    >
      <div
        className="w-[74px] h-[104px] md:w-28 md:h-40 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
          border: '2px solid #3b2d5c',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(170,51,255,0.3)',
        }}
      >
        <motion.span
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-4xl md:text-5xl opacity-60"
        >
          🎴
        </motion.span>
      </div>
    </motion.div>
  );
}

function SuspensePhase({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, PHASE_DURATIONS.suspense);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <motion.div
        style={{ perspective: 600 }}
        className="relative"
      >
        <motion.div
          animate={{
            rotateY: [0, 30, -30, 15, -15, 0],
            scale: [1, 1.05, 0.95, 1.02, 0.98, 1],
          }}
          transition={{
            duration: PHASE_DURATIONS.suspense / 1000,
            ease: 'easeInOut',
          }}
          className="w-[74px] h-[104px] md:w-28 md:h-40 rounded-2xl flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(155deg, #1f183b 0%, #0d0a1b 100%)',
            border: '2px solid #3b2d5c',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 30px rgba(170,51,255,0.4)',
          }}
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            className="text-4xl md:text-5xl"
          >
            🎴
          </motion.span>

          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(170,51,255,0.2) 0%, transparent 70%)',
            }}
          />
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl border-2 border-accent/50 pointer-events-none"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
            className="text-2xl"
          >
            .
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

function SafeRevealPhase({
  cardType,
  actorName,
  onComplete,
}: {
  cardType: CardType;
  actorName: string;
  onComplete: () => void;
}) {
  const info = CARD_INFO[cardType];

  useEffect(() => {
    const t = setTimeout(onComplete, PHASE_DURATIONS.reveal);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <motion.div style={{ perspective: 800 }} className="relative">
        <motion.div
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-[74px] h-[104px] md:w-28 md:h-40 rounded-2xl flex flex-col items-center justify-center gap-2 relative"
          style={{
            background: `linear-gradient(155deg, ${info.color}33 0%, #0d0a1b 100%)`,
            border: `2px solid ${info.color}`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 30px ${info.color}55`,
          }}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-4xl md:text-5xl drop-shadow-lg"
          >
            {info.emoji}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="text-[10px] md:text-xs font-bold text-white/80 text-center px-1"
          >
            {info.name}
          </motion.span>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(ellipse at center, ${info.color}66 0%, transparent 70%)`,
            }}
          />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
        transition={{ duration: PHASE_DURATIONS.reveal / 1000 }}
        className="text-white/80 text-base md:text-lg font-semibold text-center"
      >
        {actorName} drew {info.name}!
      </motion.p>
    </div>
  );
}

function KittenRevealPhase({
  actorName,
  hasDefuse,
  onComplete,
  onDefusePlace,
}: {
  actorName: string;
  hasDefuse: boolean;
  onComplete: () => void;
  onDefusePlace: () => void;
}) {
  const [showDefusePrompt, setShowDefusePrompt] = useState(false);

  useEffect(() => {
    if (hasDefuse) {
      const t = setTimeout(() => setShowDefusePrompt(true), 800);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [hasDefuse, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="relative">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: [0, 1.5, 1.2], rotate: [-30, 10, -5] }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          className="text-[100px] md:text-[140px] drop-shadow-[0_0_40px_rgba(255,51,51,0.9)]"
        >
          💣
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-4 border-danger/60 pointer-events-none"
        />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos((i * Math.PI * 2) / 6) * 80,
              y: Math.sin((i * Math.PI * 2) / 6) * 80,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-danger"
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-center"
      >
        <p
          className="text-3xl md:text-5xl font-black uppercase tracking-tight"
          style={{
            fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
            color: '#ff3355',
            textShadow: '0 0 30px rgba(255,51,85,0.9), 4px 4px 0 #7a0020',
            WebkitTextStroke: '2px #7a0020',
          }}
        >
          EXPLODING KITTEN!
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-white/70 text-sm md:text-base"
      >
        {actorName} drew the Exploding Kitten!
      </motion.p>

      {showDefusePrompt && hasDefuse && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-3 mt-4"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-5xl"
          >
            🛡️
          </motion.div>
          <p
            className="text-xl md:text-2xl font-black uppercase tracking-tight"
            style={{
              fontFamily: 'var(--font-display), Impact, "Arial Black", sans-serif',
              color: '#2bd47c',
              textShadow: '0 0 20px rgba(43,212,124,0.8), 3px 3px 0 #0a4a24',
              WebkitTextStroke: '1px #0a4a24',
            }}
          >
            DEFUSED!
          </p>
          <p className="text-white/60 text-sm">Placing kitten back in deck...</p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onDefusePlace();
              onComplete();
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-success to-[#20d47c] text-white font-black text-base shadow-[0_4px_20px_rgba(43,212,124,0.4)]"
          >
            Place the Kitten!
          </motion.button>
        </motion.div>
      )}

      {!hasDefuse && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-danger font-bold text-lg animate-pulse"
        >
          💥 NO DEFUSE! 💥
        </motion.p>
      )}
    </div>
  );
}

export default function DrawCardAnimation({
  state,
  onDone,
  onDefusePlace,
  deckPosition,
  playerPosition,
}: Props) {
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState<'travel' | 'suspense' | 'reveal' | 'defuse' | 'done'>('travel');

  const defaultCenter = { x: 0, y: 0 };
  const deckPos = deckPosition || { x: -200, y: -100 };
  const playerPos = playerPosition || defaultCenter;

  const handleTravelComplete = useCallback(() => {
    setPhase('suspense');
  }, []);

  const handleSuspenseComplete = useCallback(() => {
    setPhase('reveal');
  }, []);

  const handleRevealComplete = useCallback(() => {
    if (state.drawnCardType === 'exploding_kitten' && state.hasDefuse) {
      setPhase('defuse');
    } else {
      setPhase('done');
      onDone();
    }
  }, [state.drawnCardType, state.hasDefuse, onDone]);

  const handleDefuseComplete = useCallback(() => {
    setPhase('done');
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!state.isPlaying) {
      setPhase('travel');
    }
  }, [state.isPlaying]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => {
        setPhase('travel');
      }, 100);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!state.isPlaying || state.phase === 'none') return null;

  if (prefersReduced) {
    return (
      <AnimatePresence>
        {state.isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDone}
            className="fixed inset-0 z-[58] flex items-center justify-center pointer-events-auto cursor-pointer"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(5,3,15,0.65) 0%, rgba(5,3,15,0.85) 100%)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <ReducedDrawAnimation cardType={state.drawnCardType} actorName={state.actorName} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {state.isPlaying && (
        <motion.div
          key={`draw-animation-${state.drawnCardType}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => {
            if (phase !== 'defuse') {
              setPhase('done');
              onDone();
            }
          }}
          className="fixed inset-0 z-[58] flex items-center justify-center pointer-events-auto cursor-pointer"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(5,3,15,0.65) 0%, rgba(5,3,15,0.85) 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          {phase === 'travel' && (
            <CardTravelAnimation
              deckPos={deckPos}
              playerPos={playerPos}
              onComplete={handleTravelComplete}
            />
          )}

          {phase === 'suspense' && (
            <SuspensePhase onComplete={handleSuspenseComplete} />
          )}

          {phase === 'reveal' && state.drawnCardType && state.drawnCardType !== 'exploding_kitten' && (
            <SafeRevealPhase
              cardType={state.drawnCardType}
              actorName={state.actorName}
              onComplete={handleRevealComplete}
            />
          )}

          {phase === 'reveal' && state.drawnCardType === 'exploding_kitten' && (
            <KittenRevealPhase
              actorName={state.actorName}
              hasDefuse={state.hasDefuse}
              onComplete={handleRevealComplete}
              onDefusePlace={onDefusePlace}
            />
          )}

          {phase === 'defuse' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-success border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-success font-bold">Defusing...</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
