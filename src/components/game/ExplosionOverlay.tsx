'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AVATARS } from '@/types/game';

interface Props {
  show: boolean;
  explodedPlayer: { name: string; avatar: number; isMe: boolean } | null;
}

export default function ExplosionOverlay({ show, explodedPlayer }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Intense red/orange flash */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at center, rgba(255,68,68,0.7) 0%, rgba(255,100,0,0.5) 40%, rgba(0,0,0,0.9) 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 0.3, 0] }}
            transition={{ duration: 2.5, times: [0, 0.05, 0.2, 0.5, 1] }}
          />

          {/* Speed lines radiating from center */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.5, 2] }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              background: `repeating-conic-gradient(from 0deg, transparent 0deg, transparent 4deg, rgba(255,200,50,0.3) 4deg, rgba(255,200,50,0.3) 5deg)`,
            }}
          />

          {/* Main explosion emoji */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 4, 3, 0], rotate: [-30, 15, -10, 25] }}
            transition={{ duration: 1.8, times: [0, 0.15, 0.35, 1], ease: 'anticipate' }}
            className="text-[140px] drop-shadow-[0_0_80px_rgba(255,51,85,0.9)] absolute"
          >
            💥
          </motion.div>

          {/* Comic "BOOM!" text */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0], y: [20, -40, -50] }}
            transition={{ duration: 2, times: [0, 0.15, 0.4, 1], delay: 0.2 }}
            className="absolute text-6xl md:text-8xl font-display tracking-wider"
            style={{
              color: '#fff',
              textShadow: '0 0 20px #ff3355, 0 0 40px #ff6600, 4px 4px 0 #ff3355, -2px -2px 0 #ff6600',
              WebkitTextStroke: '2px #ff3355',
            }}
          >
            BOOM!
          </motion.div>

          {/* Exploding player avatar + death recap */}
          {explodedPlayer && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: [0, 0, 1, 1, 0], y: [40, 40, 60, 60, 80] }}
              transition={{ duration: 2.5, times: [0, 0.3, 0.4, 0.7, 1] }}
              className="absolute bottom-1/4 flex flex-col items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 0.9, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="relative"
              >
                <span className="text-6xl drop-shadow-[0_0_20px_rgba(255,51,85,0.8)]">
                  {AVATARS[explodedPlayer.avatar] || '😼'}
                </span>
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="absolute inset-0 rounded-full border-4 border-danger"
                />
              </motion.div>
              <div className="text-center px-4 py-2 rounded-xl bg-black/60 backdrop-blur-sm">
                <p className="text-lg font-bold text-danger">
                  {explodedPlayer.isMe ? 'You exploded!' : `${explodedPlayer.name} exploded!`}
                </p>
                <p className="text-xs text-text-muted">
                  {explodedPlayer.isMe ? 'No Defuse card to save you...' : 'They had no Defuse card!'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Scattered debris particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                scale: 0,
                opacity: 0,
                rotate: Math.random() * 720,
              }}
              transition={{ duration: 1.2, delay: 0.1 + i * 0.03, ease: 'easeOut' }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ background: ['#ff4444', '#ff6600', '#ffaa00', '#ffdd00'][i % 4] }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
