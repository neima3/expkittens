'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { CARD_INFO } from '@/types/game';
import type { CardType } from '@/types/game';

const cardOrder: CardType[] = [
  'exploding_kitten', 'defuse', 'attack', 'skip', 'shuffle',
  'see_the_future', 'favor', 'nope', 'taco_cat', 'rainbow_cat',
  'beard_cat', 'cattermelon', 'potato_cat',
];

export default function RulesPage() {
  return (
    <div className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto overflow-y-auto scroll-touch">
      <Link
        href="/"
        className="text-text-muted active:text-text mb-6 inline-flex items-center gap-2 py-2 min-h-[44px]"
      >
        ← Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-[1.5rem] p-5 md:p-8"
      >
        <h1 className="display-font text-4xl mb-2">
          <span className="bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent">
            How to Play
          </span>
        </h1>
        <p className="text-text-muted mb-8">Exploding Kittens - The Rules</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">Overview</h2>
          <p className="text-text-muted leading-relaxed">
            Exploding Kittens is a strategic card game where players take turns drawing cards.
            If you draw an <strong className="text-danger">Exploding Kitten</strong>, you&apos;re out
            &mdash; unless you have a <strong className="text-success">Defuse</strong> card.
            The last player standing wins!
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">How to Play</h2>
          <ol className="space-y-3 text-text-muted">
            <li className="flex gap-3">
              <span className="text-accent font-bold">1.</span>
              <span>Each player starts with <strong>7 random cards</strong> and <strong>1 Defuse</strong> card.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">2.</span>
              <span>On your turn, you can <strong>play as many cards</strong> as you want (or none).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">3.</span>
              <span>Then you <strong>must draw a card</strong> from the draw pile to end your turn.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">4.</span>
              <span>If you draw an <strong className="text-danger">Exploding Kitten</strong> and don&apos;t have a Defuse, you&apos;re <strong>eliminated</strong>!</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">5.</span>
              <span>If you have a <strong className="text-success">Defuse</strong>, you can save yourself and secretly place the Exploding Kitten back in the deck anywhere you choose.</span>
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">Special Combos</h2>
          <div className="space-y-3 text-text-muted">
            <div className="bg-surface-light rounded-xl p-4 border border-border">
              <p className="font-bold text-warning mb-1">Two of a Kind (Pair)</p>
              <p className="text-sm">Play 2 matching cat cards to <strong>steal a random card</strong> from any player.</p>
            </div>
            <div className="bg-surface-light rounded-xl p-4 border border-border">
              <p className="font-bold text-warning mb-1">Three of a Kind</p>
              <p className="text-sm">Play 3 matching cat cards to <strong>name a specific card</strong> and steal it from any player (if they have it).</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Card Types</h2>
          <div className="grid gap-3">
            {cardOrder.map(type => {
              const info = CARD_INFO[type];
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-surface-light rounded-xl p-3 border border-border"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${info.color}22` }}
                  >
                    {info.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: info.color }}>
                      {info.name}
                    </p>
                    <p className="text-xs text-text-muted">{info.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-3">Tips</h2>
          <ul className="space-y-2 text-text-muted text-sm">
            <li>Save your Defuse cards — they&apos;re your lifeline!</li>
            <li>Use See the Future before drawing to check if it&apos;s safe.</li>
            <li>If you see an Exploding Kitten on top, play Shuffle, Skip, or Attack.</li>
            <li>When placing a defused Exploding Kitten, put it near the top to trap the next player.</li>
            <li>Collect cat card pairs to steal important cards from opponents.</li>
          </ul>
        </section>

        <div className="text-center mt-12 mb-8">
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block px-8 py-3 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold text-lg"
            >
              Play Now!
            </motion.span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
