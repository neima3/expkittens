'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CARD_INFO } from '@/types/game';
import type { CardType } from '@/types/game';

// ─── Tutorial state machine ───────────────────────────────────────────────────

type TutorialStep = {
  id: string;
  coach: string;
  subtext?: string;
  highlight?: 'hand' | 'deck' | 'discard' | 'card' | 'none';
  highlightCard?: number; // index in hand
  action?: 'draw' | 'play' | 'acknowledge' | 'defuse';
  actionLabel?: string;
  phase?: 'intro' | 'game';
};

// Fixed tutorial hand — carefully chosen to teach key mechanics
const TUTORIAL_HAND: CardType[] = ['see_the_future', 'attack', 'skip', 'defuse', 'taco_cat'];

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    coach: 'Welcome to Exploding Kittens! 💣',
    subtext: 'I\'m your tutorial coach. I\'ll guide you through your first game in about 3 minutes.',
    highlight: 'none',
    action: 'acknowledge',
    actionLabel: 'Let\'s Go!',
    phase: 'intro',
  },
  {
    id: 'goal',
    coach: 'The goal is simple: don\'t explode.',
    subtext: 'On each turn you can play cards from your hand, then MUST draw one card. If you draw an Exploding Kitten... 💥 you\'re out!',
    highlight: 'none',
    action: 'acknowledge',
    actionLabel: 'Got it',
    phase: 'intro',
  },
  {
    id: 'hand_intro',
    coach: 'This is your hand. 🃏',
    subtext: 'You start with 7 cards plus a Defuse. Hover or tap any card to preview what it does. Let\'s take a look at your cards!',
    highlight: 'hand',
    action: 'acknowledge',
    actionLabel: 'I\'ve looked at my cards',
    phase: 'game',
  },
  {
    id: 'see_future_explain',
    coach: 'Start with See the Future! 🔮',
    subtext: 'This powerful card lets you peek at the top 3 cards of the deck. Play it to check whether it\'s safe to draw.',
    highlight: 'card',
    highlightCard: 0,
    action: 'play',
    actionLabel: 'Play See the Future',
    phase: 'game',
  },
  {
    id: 'see_future_result',
    coach: 'You peeked! Top 3 cards: Skip, Taco Cat, Skip.',
    subtext: 'No Exploding Kitten nearby — it\'s safe to draw. But wait... you have better options. Let\'s use a Skip card instead!',
    highlight: 'none',
    action: 'acknowledge',
    actionLabel: 'Interesting...',
    phase: 'game',
  },
  {
    id: 'skip_explain',
    coach: 'Play Skip to end your turn WITHOUT drawing! ⏭️',
    subtext: 'After using See the Future, you can choose to skip your draw entirely. This is a key survival move.',
    highlight: 'card',
    highlightCard: 2,
    action: 'play',
    actionLabel: 'Play Skip',
    phase: 'game',
  },
  {
    id: 'turn_2_intro',
    coach: 'Your opponent just played Attack on you! ⚔️',
    subtext: 'You now have to take 2 turns. But you have an Attack card too — you can chain it to redirect the turns to the next player!',
    highlight: 'card',
    highlightCard: 1,
    action: 'acknowledge',
    actionLabel: 'I see!',
    phase: 'game',
  },
  {
    id: 'attack_play',
    coach: 'Play your Attack card to escape! ⚔️',
    subtext: 'Chaining an Attack ends your turn immediately and forces the NEXT player to take ALL the accumulated turns (4 in this case).',
    highlight: 'card',
    highlightCard: 1,
    action: 'play',
    actionLabel: 'Play Attack',
    phase: 'game',
  },
  {
    id: 'danger_intro',
    coach: 'Turn 3. An opponent played See the Future...',
    subtext: '...and they look worried. The Exploding Kitten is near the top! You MUST draw this turn.',
    highlight: 'deck',
    action: 'acknowledge',
    actionLabel: 'Uh oh...',
    phase: 'game',
  },
  {
    id: 'draw_kitten',
    coach: 'You drew an Exploding Kitten! 💣',
    subtext: 'Don\'t panic — you have a Defuse card! It\'s your lifeline. Play it immediately to survive.',
    highlight: 'card',
    highlightCard: 3,
    action: 'defuse',
    actionLabel: 'Play Defuse! 🔧',
    phase: 'game',
  },
  {
    id: 'defuse_place',
    coach: 'You\'re saved! 🎉 Now place the Exploding Kitten back.',
    subtext: 'You can place it anywhere in the deck. Pro tip: insert it near the top to trap your opponent on their next draw.',
    highlight: 'deck',
    action: 'acknowledge',
    actionLabel: 'Place it near the top',
    phase: 'game',
  },
  {
    id: 'nope_intro',
    coach: 'One more card to know: Nope! ✋',
    subtext: 'When another player plays an Action card, you can instantly play a Nope to cancel it. Even Nopes can be Noped — it\'s chaos!',
    highlight: 'none',
    action: 'acknowledge',
    actionLabel: 'Understood',
    phase: 'game',
  },
  {
    id: 'complete',
    coach: 'Tutorial complete! You\'re ready to play. 🏆',
    subtext: 'Remember: Save Defuse cards. Use See the Future before drawing. Nope Attacks on other players. Good luck!',
    highlight: 'none',
    action: 'acknowledge',
    actionLabel: 'Play a Real Game!',
    phase: 'intro',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TutorialCard({
  cardType,
  highlighted,
  index,
  total,
}: {
  cardType: CardType;
  highlighted: boolean;
  index: number;
  total: number;
}) {
  const info = CARD_INFO[cardType];
  const [hovered, setHovered] = useState(false);

  // Fan spread calculation
  const spread = Math.min(22, 110 / total);
  const mid = (total - 1) / 2;
  const rotation = (index - mid) * spread * 0.7;
  const translateY = Math.abs(index - mid) * 4;

  const cardStyle = (() => {
    switch (cardType) {
      case 'see_the_future': return { bg: 'linear-gradient(145deg, #2e0840 0%, #170221 60%, #0c0012 100%)', border: '#ff33d4', glow: '#ff33d4' };
      case 'attack': return { bg: 'linear-gradient(145deg, #4a1c0b 0%, #2a0c02 60%, #170400 100%)', border: '#ff5f2e', glow: '#ff5f2e' };
      case 'skip': return { bg: 'linear-gradient(145deg, #0a2a4f 0%, #05162a 60%, #020b17 100%)', border: '#3388ff', glow: '#3388ff' };
      case 'defuse': return { bg: 'linear-gradient(145deg, #0f381f 0%, #0a2614 60%, #05140a 100%)', border: '#2bd47c', glow: '#2bd47c' };
      case 'taco_cat': return { bg: 'linear-gradient(145deg, #40360a 0%, #211b03 60%, #120e01 100%)', border: '#ffb833', glow: '#ffb833' };
      default: return { bg: 'linear-gradient(145deg, #1f183b 0%, #0d0a1b 100%)', border: '#443468', glow: '#443468' };
    }
  })();

  return (
    <motion.div
      className="absolute bottom-0 cursor-pointer select-none"
      style={{
        left: `calc(50% + ${(index - mid) * (total <= 3 ? 52 : 40)}px)`,
        transformOrigin: 'bottom center',
        zIndex: hovered || highlighted ? 30 : index,
      }}
      animate={{
        rotate: rotation,
        y: highlighted ? -28 : hovered ? -16 : translateY,
        scale: highlighted ? 1.12 : hovered ? 1.06 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <div
        className="relative w-16 h-24 md:w-20 md:h-28 rounded-2xl overflow-hidden"
        style={{
          background: cardStyle.bg,
          border: `2px solid ${highlighted ? cardStyle.border : `${cardStyle.border}55`}`,
          boxShadow: highlighted
            ? `0 0 24px ${cardStyle.glow}88, 0 8px 24px rgba(0,0,0,0.6)`
            : hovered
              ? `0 0 16px ${cardStyle.glow}55, 0 6px 16px rgba(0,0,0,0.5)`
              : `0 4px 12px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/50 pointer-events-none" />
        {highlighted && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ background: `radial-gradient(circle at center, ${cardStyle.glow}44, transparent 70%)` }}
          />
        )}
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl md:text-3xl drop-shadow">{info.emoji}</span>
          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wide text-white/80 text-center px-1 leading-tight">
            {info.name}
          </span>
        </div>
      </div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {hovered && !highlighted && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl z-50 min-w-[180px] text-center pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${cardStyle.border}12, rgba(19,15,37,0.98))`,
              border: `1px solid ${cardStyle.border}55`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 16px ${cardStyle.glow}22`,
            }}
          >
            <p className="font-black text-xs mb-0.5" style={{ color: info.color }}>{info.emoji} {info.name}</p>
            <p className="text-[10px] text-text-muted leading-snug">{info.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CoachBubble({ step, onAction }: { step: TutorialStep; onAction: () => void }) {
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-3xl p-5 md:p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(31,24,59,0.98), rgba(19,15,37,0.98))',
        border: '1px solid rgba(59,45,92,0.8)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
      }}
    >
      {/* Coach avatar */}
      <div className="flex items-start gap-3 mb-3">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-3xl flex-shrink-0"
        >
          😸
        </motion.div>
        <div className="flex-1">
          <p className="font-black text-base text-white leading-snug">{step.coach}</p>
          {step.subtext && (
            <p className="text-sm text-text-muted leading-relaxed mt-1">{step.subtext}</p>
          )}
        </div>
      </div>

      {/* Action button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onAction}
        className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wide transition-all"
        style={{
          background: step.action === 'defuse'
            ? 'linear-gradient(135deg, #2bd47c, #1a9c58)'
            : step.action === 'play'
              ? 'linear-gradient(135deg, #ff5f2e, #ff8844)'
              : 'linear-gradient(135deg, #aa33ff, #7722cc)',
          boxShadow: step.action === 'defuse'
            ? '0 4px 16px rgba(43,212,124,0.3)'
            : step.action === 'play'
              ? '0 4px 16px rgba(255,95,46,0.3)'
              : '0 4px 16px rgba(170,51,255,0.3)',
          color: 'white',
        }}
      >
        {step.actionLabel ?? 'Continue →'}
      </motion.button>
    </motion.div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const gamePart = STEPS.filter(s => s.phase === 'game');
  const gameStart = STEPS.findIndex(s => s.phase === 'game');
  const currentIsGame = STEPS[current]?.phase === 'game';
  const gameProgress = currentIsGame
    ? ((current - gameStart) / gamePart.length) * 100
    : current < gameStart ? 0 : 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent to-warning"
          animate={{ width: `${(current / (total - 1)) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <span className="text-xs text-text-muted font-medium tabular-nums">
        {current + 1}/{total}
      </span>
    </div>
  );
}

// ─── Mock game elements ────────────────────────────────────────────────────────

function MockDeck({ highlighted }: { highlighted: boolean }) {
  return (
    <motion.div
      animate={{
        scale: highlighted ? [1, 1.05, 1] : 1,
        boxShadow: highlighted
          ? ['0 0 20px rgba(255,95,46,0.4)', '0 0 40px rgba(255,95,46,0.7)', '0 0 20px rgba(255,95,46,0.4)']
          : '0 0 0px transparent',
      }}
      transition={{ duration: 1.5, repeat: highlighted ? Infinity : 0 }}
      className="relative w-16 h-24 md:w-20 md:h-28 rounded-2xl flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(145deg, #2a1845, #1a0f30)',
        border: `2px solid ${highlighted ? 'rgba(255,95,46,0.8)' : 'rgba(59,45,92,0.8)'}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <span className="text-2xl">🎴</span>
      <span className="text-[10px] text-text-muted font-bold mt-1">DECK</span>
      <span className="text-xs font-black text-warning">24</span>
    </motion.div>
  );
}

function MockDiscard({ highlighted }: { highlighted: boolean }) {
  return (
    <div
      className="relative w-16 h-24 md:w-20 md:h-28 rounded-2xl flex flex-col items-center justify-center"
      style={{
        background: 'rgba(19,15,37,0.6)',
        border: `2px dashed ${highlighted ? 'rgba(255,184,51,0.6)' : 'rgba(59,45,92,0.4)'}`,
      }}
    >
      <span className="text-xl opacity-40">🃏</span>
      <span className="text-[10px] text-text-muted/60 font-bold mt-1">DISCARD</span>
    </div>
  );
}

function MockOpponent() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
      style={{ background: 'rgba(19,15,37,0.7)', border: '1px solid rgba(59,45,92,0.5)' }}
    >
      <span className="text-2xl">😾</span>
      <div>
        <p className="text-xs font-bold text-text">Whiskers</p>
        <p className="text-[10px] text-text-muted">5 cards • 😼 Normal</p>
      </div>
    </div>
  );
}

function HandHighlightRing() {
  return (
    <motion.div
      className="absolute -inset-3 rounded-3xl pointer-events-none"
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity }}
      style={{
        border: '2px solid rgba(255,184,51,0.6)',
        boxShadow: '0 0 20px rgba(255,184,51,0.2)',
      }}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TutorialPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [playedCards, setPlayedCards] = useState<number[]>([]);
  const [showKitten, setShowKitten] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function handleAction() {
    if (isLast) {
      // Mark tutorial seen
      try { localStorage.setItem('ek_tutorial_done', '1'); } catch (_) { /* ignore */ }
      router.push('/');
      return;
    }

    // Track played cards for visual feedback
    if (step.action === 'play' && step.highlightCard !== undefined) {
      setPlayedCards(prev => [...prev, step.highlightCard!]);
    }

    if (step.id === 'draw_kitten') {
      setShowKitten(true);
    }

    setStepIndex(i => i + 1);
  }

  // Hand cards with played ones removed
  const visibleHand = TUTORIAL_HAND.map((type, i) => ({
    type,
    originalIndex: i,
    played: playedCards.includes(i),
  })).filter(c => !c.played);

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <Link
          href="/"
          className="text-text-muted hover:text-text active:text-accent transition-colors text-sm font-medium py-2 min-h-[44px] flex items-center gap-1.5"
        >
          ← Exit Tutorial
        </Link>
        <span className="text-sm font-black text-accent uppercase tracking-wide">🎓 Tutorial</span>
        <Link
          href="/cards"
          className="text-text-muted hover:text-text active:text-accent transition-colors text-sm font-medium py-2 min-h-[44px] flex items-center gap-1.5"
        >
          Card Guide →
        </Link>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3 pb-1 max-w-xl mx-auto w-full">
        <ProgressBar current={stepIndex} total={STEPS.length} />
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4">

        {/* Opponent zone */}
        <div className="py-4 flex justify-center">
          <MockOpponent />
        </div>

        {/* Center — deck + discard */}
        <div className="flex items-center justify-center gap-6 py-2">
          <MockDiscard highlighted={step.highlight === 'discard'} />
          <MockDeck highlighted={step.highlight === 'deck'} />
        </div>

        {/* Exploding Kitten drawn animation */}
        <AnimatePresence>
          {showKitten && stepIndex >= STEPS.findIndex(s => s.id === 'draw_kitten') && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
            >
              <div className="text-8xl drop-shadow-[0_0_40px_rgba(255,68,0,0.9)]">
                💣
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player hand */}
        <div className="flex-1 relative min-h-[140px] flex items-end justify-center pb-2">
          {step.highlight === 'hand' && <HandHighlightRing />}
          <div className="relative" style={{ width: `${Math.min(360, visibleHand.length * 60)}px`, height: '120px' }}>
            {visibleHand.map((card, displayIndex) => (
              <TutorialCard
                key={`${card.type}-${card.originalIndex}`}
                cardType={card.type}
                highlighted={step.highlight === 'card' && step.highlightCard !== undefined && card.originalIndex === step.highlightCard}
                index={displayIndex}
                total={visibleHand.length}
              />
            ))}
          </div>
        </div>

        {/* Player label */}
        <div className="text-center pb-2">
          <span className="text-xs text-text-muted font-medium">Your Hand</span>
        </div>

        {/* Coach bubble */}
        <div className="pb-6">
          <AnimatePresence mode="wait">
            <CoachBubble key={step.id} step={step} onAction={handleAction} />
          </AnimatePresence>
        </div>
      </div>

      {/* Skip tutorial link */}
      {stepIndex < STEPS.length - 1 && (
        <div className="text-center pb-4">
          <button
            onClick={() => {
              try { localStorage.setItem('ek_tutorial_done', '1'); } catch (_) { /* ignore */ }
              router.push('/');
            }}
            className="text-xs text-text-muted/50 hover:text-text-muted transition-colors py-2 px-4"
          >
            Skip tutorial
          </button>
        </div>
      )}
    </div>
  );
}
