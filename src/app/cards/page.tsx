'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CARD_INFO, CAT_CARD_TYPES, ACTION_CARD_TYPES } from '@/types/game';
import type { CardType } from '@/types/game';
import { CardIllustration } from '@/components/game/CardIllustrations';

const CARD_DETAILS: Record<CardType, {
  tip: string;
  nopeable: boolean;
  quantity: string;
  category: string;
  danger: 'low' | 'medium' | 'high' | 'critical';
}> = {
  exploding_kitten: {
    tip: 'You can\'t Nope a drawn Exploding Kitten. Your only hope is a Defuse card. If you have one, you get to secretly reinsert it anywhere in the deck — put it near the top to trap your opponent!',
    nopeable: false,
    quantity: 'N−1 (one per player minus one)',
    category: 'DANGER',
    danger: 'critical',
  },
  defuse: {
    tip: 'Your most valuable card — NEVER discard it carelessly. When defusing, consider placing the Exploding Kitten on top or second from top to trap the next player.',
    nopeable: false,
    quantity: '1 per player + 2 extras',
    category: 'LIFESAVER',
    danger: 'low',
  },
  attack: {
    tip: 'Powerful! You skip your draw AND the next player takes 2 turns (or 4 if they were already attacked — Attacks stack!). Combine with See the Future to attack into a safe deck.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'ACTION',
    danger: 'high',
  },
  skip: {
    tip: 'Your safe escape. If you used See the Future and spotted an Exploding Kitten on top, play Skip immediately. Also lets you escape an Attack (counts as 1 of the 2 forced turns).',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'ACTION',
    danger: 'medium',
  },
  favor: {
    tip: 'You demand a card from any player — they choose which one to give. Target players you suspect have Defuse cards or powerful action cards. Time it when they\'re forced to give up something good.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'ACTION',
    danger: 'medium',
  },
  shuffle: {
    tip: 'Shuffle randomizes the deck, killing any See the Future knowledge. Use it when you know an Exploding Kitten is near the top and you can\'t avoid drawing. Also resets the danger for everyone.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'ACTION',
    danger: 'medium',
  },
  see_the_future: {
    tip: 'The most strategic card in the game. Peek the top 3 cards — if an Exploding Kitten is near the top, follow up with Attack, Skip, or Shuffle. Keep this info secret from opponents!',
    nopeable: true,
    quantity: '5 in the deck',
    category: 'ACTION',
    danger: 'low',
  },
  nope: {
    tip: 'Cancel ANY action card another player plays (except Exploding Kittens and Defuses). You can also Nope a Nope to re-allow the original action. Save Nopes for Attacks and Favors.',
    nopeable: false,
    quantity: '5 in the deck',
    category: 'COUNTER',
    danger: 'high',
  },
  taco_cat: {
    tip: 'By itself, useless. Pair 2 Taco Cats to steal a random card from any player. Play 3 to name and steal a specific card. Collect cat combos strategically to steal Defuse cards!',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'CAT CARD',
    danger: 'low',
  },
  rainbow_cat: {
    tip: 'Combine with another Rainbow Cat (pair) to steal a random card. Or collect 3 to name a specific card you want — like stealing someone\'s Defuse. Mix with other cat types only for 5-of-a-kind.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'CAT CARD',
    danger: 'low',
  },
  beard_cat: {
    tip: 'Two matching cats = steal random card. Three matching cats = steal named card. Hold onto Beard Cats if you\'re collecting a pair — they\'re your ticket to stealing a targeted card.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'CAT CARD',
    danger: 'low',
  },
  cattermelon: {
    tip: 'Pairs are powerful — play 2 Cattermelons to steal randomly, or save for 3 to pick exactly what you need. Use pairs early to thin your hand while generating value.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'CAT CARD',
    danger: 'low',
  },
  potato_cat: {
    tip: 'Each Potato Cat is a potential combo piece. Hoard them silently until you have a pair or triple. Opponents won\'t know what\'s coming until you slam down 3 and take their Defuse.',
    nopeable: true,
    quantity: '4 in the deck',
    category: 'CAT CARD',
    danger: 'low',
  },
  // Imploding Kittens expansion
  imploding_kitten: {
    tip: 'Draw it face-down and you must place it back face-up — everyone now sees it ticking in the deck. Draw it face-up and you implode instantly: no Defuse can save you! Strategic placement is key.',
    nopeable: false,
    quantity: '1 per game (expansion)',
    category: 'DANGER',
    danger: 'critical',
  },
  reverse: {
    tip: 'Flips the play direction and skips your draw, acting like a turbo-Skip. Combine with Attack to send 2 forced turns backwards. Great for turning the pressure around on aggressive players.',
    nopeable: true,
    quantity: '4 in the deck (expansion)',
    category: 'ACTION',
    danger: 'medium',
  },
  draw_from_bottom: {
    tip: 'Draw from the bottom instead of the top. Useful when See the Future revealed an Exploding Kitten at the top — dodge it entirely. But be careful: nobody knows what lurks at the bottom!',
    nopeable: true,
    quantity: '4 in the deck (expansion)',
    category: 'ACTION',
    danger: 'medium',
  },
  feral_cat: {
    tip: 'A wild card that pairs with ANY other cat for a steal combo. Play it with one cat for a random steal (pair), or use it alongside two matching cats for a targeted steal (triple). Extremely flexible.',
    nopeable: true,
    quantity: '4 in the deck (expansion)',
    category: 'CAT CARD',
    danger: 'medium',
  },
  // Streaking Kittens expansion
  streaking_kitten: {
    tip: 'Hold this in your hand as a passive shield. If you draw an Exploding Kitten and have no Defuse, the Streaking Kitten auto-activates: it\'s discarded and the EK is shuffled back into the deck. Defuse still takes priority when you have both.',
    nopeable: false,
    quantity: '4 in the deck (Streaking Kittens expansion)',
    category: 'Lifesaver',
    danger: 'low',
  },
};

const ALL_CARDS: CardType[] = [
  'exploding_kitten', 'defuse', 'attack', 'skip', 'favor',
  'shuffle', 'see_the_future', 'nope',
  'taco_cat', 'rainbow_cat', 'beard_cat', 'cattermelon', 'potato_cat',
  // Imploding Kittens expansion
  'imploding_kitten', 'reverse', 'draw_from_bottom', 'feral_cat',
  // Streaking Kittens expansion
  'streaking_kitten',
];

const CATEGORIES = ['All', 'Action', 'Cat Card', 'Counter', 'Danger', 'Lifesaver'] as const;
type CategoryFilter = typeof CATEGORIES[number];

function getCategoryFilter(type: CardType): CategoryFilter {
  if (type === 'exploding_kitten' || type === 'imploding_kitten') return 'Danger';
  if (type === 'defuse') return 'Lifesaver';
  if (type === 'nope') return 'Counter';
  if (CAT_CARD_TYPES.includes(type)) return 'Cat Card';
  if (ACTION_CARD_TYPES.includes(type)) return 'Action';
  return 'Action';
}

function getCardStyle(type: CardType) {
  switch (type) {
    case 'exploding_kitten': return { border: '#ff2200', glow: '#ff2200', bg: 'radial-gradient(circle at 50% 0%, #3a0000 0%, #1a0000 70%, #000 100%)' };
    case 'defuse': return { border: '#2bd47c', glow: '#2bd47c', bg: 'linear-gradient(145deg, #0f381f 0%, #0a2614 60%, #05140a 100%)' };
    case 'attack': return { border: '#ff5f2e', glow: '#ff5f2e', bg: 'linear-gradient(145deg, #4a1c0b 0%, #2a0c02 60%, #170400 100%)' };
    case 'skip': return { border: '#3388ff', glow: '#3388ff', bg: 'linear-gradient(145deg, #0a2a4f 0%, #05162a 60%, #020b17 100%)' };
    case 'favor': return { border: '#2fd19f', glow: '#2fd19f', bg: 'linear-gradient(145deg, #103b42 0%, #071f24 60%, #031114 100%)' };
    case 'shuffle': return { border: '#aa33ff', glow: '#aa33ff', bg: 'linear-gradient(145deg, #2a0a2f 0%, #130317 60%, #0b010d 100%)' };
    case 'see_the_future': return { border: '#ff33d4', glow: '#ff33d4', bg: 'linear-gradient(145deg, #2e0840 0%, #170221 60%, #0c0012 100%)' };
    case 'nope': return { border: '#7580a0', glow: '#7580a0', bg: 'linear-gradient(145deg, #282a35 0%, #12141c 60%, #080a0f 100%)' };
    case 'taco_cat': return { border: '#ffb833', glow: '#ffb833', bg: 'linear-gradient(145deg, #40360a 0%, #211b03 60%, #120e01 100%)' };
    case 'rainbow_cat': return { border: '#ff4488', glow: '#ff4488', bg: 'linear-gradient(145deg, #4a0d2f 0%, #210314 60%, #12000a 100%)' };
    case 'beard_cat': return { border: '#d48844', glow: '#d48844', bg: 'linear-gradient(145deg, #30180a 0%, #170a02 60%, #0c0400 100%)' };
    case 'cattermelon': return { border: '#44cc66', glow: '#44cc66', bg: 'linear-gradient(145deg, #183818 0%, #0a1f0a 60%, #041204 100%)' };
    case 'potato_cat': return { border: '#ccaa66', glow: '#ccaa66', bg: 'linear-gradient(145deg, #382c16 0%, #1c1407 60%, #0f0a02 100%)' };
    default: return { border: '#443468', glow: '#443468', bg: 'linear-gradient(145deg, #1f183b 0%, #0d0a1b 100%)' };
  }
}

function DangerBadge({ level }: { level: 'low' | 'medium' | 'high' | 'critical' }) {
  const config = {
    low: { label: 'Safe', color: '#2bd47c' },
    medium: { label: 'Tactical', color: '#ffb833' },
    high: { label: 'Dangerous', color: '#ff5f2e' },
    critical: { label: 'LETHAL', color: '#ff2200' },
  }[level];
  return (
    <span
      className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border"
      style={{ color: config.color, borderColor: `${config.color}55`, background: `${config.color}15` }}
    >
      {config.label}
    </span>
  );
}

function CardEntry({ type, index }: { type: CardType; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const info = CARD_INFO[type];
  const details = CARD_DETAILS[type];
  const style = getCardStyle(type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      layout
    >
      <motion.button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left rounded-2xl border overflow-hidden transition-all"
        style={{
          borderColor: expanded ? `${style.border}66` : 'rgba(59,45,92,0.5)',
          background: expanded
            ? `linear-gradient(135deg, ${style.border}10, rgba(19,15,37,0.95))`
            : 'rgba(19,15,37,0.7)',
          boxShadow: expanded ? `0 0 24px ${style.glow}22` : 'none',
        }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-4">
          {/* Mini card art */}
          <div
            className="relative w-14 h-20 rounded-xl flex-shrink-0 overflow-hidden"
            style={{
              background: style.bg,
              border: `1.5px solid ${style.border}88`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${style.glow}33`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <CardIllustration type={type} className="w-12 h-16 opacity-75" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/50 pointer-events-none" />
            <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
              <span className="text-[10px] font-black text-white/80 text-center leading-tight px-1 uppercase tracking-wide">
                {info.name.split(' ').map(w => w[0]).join('')}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-lg">{info.emoji}</span>
              <span className="font-black text-base" style={{ color: info.color }}>{info.name}</span>
              <span
                className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border"
                style={{ color: style.border, borderColor: `${style.border}44`, background: `${style.border}12` }}
              >
                {details.category}
              </span>
              <DangerBadge level={details.danger} />
            </div>
            <p className="text-sm text-text-muted leading-snug">{info.description}</p>
          </div>

          {/* Chevron */}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-text-muted text-lg flex-shrink-0 ml-1"
          >
            ▾
          </motion.span>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-5 pt-2 border-t"
                style={{ borderColor: `${style.border}33` }}
              >
                {/* Strategic tip */}
                <div
                  className="rounded-xl p-3 mb-3"
                  style={{
                    background: `${style.border}10`,
                    border: `1px solid ${style.border}33`,
                  }}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-1.5" style={{ color: style.border }}>
                    🧠 Strategic Tip
                  </p>
                  <p className="text-sm text-text-muted leading-relaxed">{details.tip}</p>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 flex-wrap text-xs text-text-muted">
                  <span>
                    <span className="text-text font-bold">Quantity:</span> {details.quantity}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-text font-bold">Nopeable:</span>
                    <span style={{ color: details.nopeable ? '#ffb833' : '#7580a0' }}>
                      {details.nopeable ? '✓ Yes' : '✗ No'}
                    </span>
                  </span>
                  {CAT_CARD_TYPES.includes(type) && (
                    <span className="text-text-muted italic">Pair to steal random · Triple to steal named</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export default function CardsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('All');

  const filtered = ALL_CARDS.filter(type => {
    const info = CARD_INFO[type];
    const matchesSearch = !search ||
      info.name.toLowerCase().includes(search.toLowerCase()) ||
      info.description.toLowerCase().includes(search.toLowerCase()) ||
      CARD_DETAILS[type].tip.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || getCategoryFilter(type) === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto overflow-y-auto scroll-touch">
      {/* Back nav */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="text-text-muted hover:text-text active:text-accent transition-colors inline-flex items-center gap-2 py-2 min-h-[44px] text-sm font-medium"
        >
          ← Back to Home
        </Link>
        <Link
          href="/tutorial"
          className="text-[#aa33ff] hover:text-[#bb44ff] active:text-[#cc55ff] transition-colors inline-flex items-center gap-1.5 py-2 min-h-[44px] text-sm font-bold"
        >
          🎓 Tutorial →
        </Link>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="display-font text-4xl md:text-5xl mb-2 bg-gradient-to-r from-white via-[#ffd27a] to-[#ff432e] bg-clip-text text-transparent">
          Card Catalog
        </h1>
        <p className="text-text-muted text-sm">
          Every card in the game — effects, quantities, and pro tips.
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-4"
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-base pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards by name or effect..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface border border-border focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-text text-sm transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-sm transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex gap-2 flex-wrap mb-6"
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border"
            style={filter === cat ? {
              background: '#ff5f2e20',
              borderColor: '#ff5f2e88',
              color: '#ff5f2e',
            } : {
              background: 'rgba(31,24,59,0.5)',
              borderColor: 'rgba(59,45,92,0.5)',
              color: '#a097bd',
            }}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-text-muted"
        >
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No cards match &quot;{search}&quot;</p>
          <button
            onClick={() => { setSearch(''); setFilter('All'); }}
            className="mt-3 text-accent text-sm hover:underline"
          >
            Clear filters
          </button>
        </motion.div>
      ) : (
        <motion.div layout className="space-y-3 pb-8">
          {filtered.map((type, i) => (
            <CardEntry key={type} type={type} index={i} />
          ))}
        </motion.div>
      )}

      {/* Stats footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs text-text-muted pb-8"
      >
        {filtered.length} of {ALL_CARDS.length} cards shown
        {filtered.length === ALL_CARDS.length && (
          <span> · Click any card to see its strategy</span>
        )}
      </motion.div>
    </div>
  );
}
