'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Player } from '@/types/game';
import { CARD_INFO } from '@/types/game';

interface Props {
  game: GameState;
  myPlayer: Player | undefined;
  playerId: string;
  onNope: (cardId: string) => void;
  onPass: () => void;
}

export default function NopeWindowBanner({ game, myPlayer, playerId, onNope, onPass }: Props) {
  const pa = game.pendingAction;
  const isNopeWindow = pa?.type === 'nope_window' && pa.expiresAt;

  return (
    <AnimatePresence>
      {isNopeWindow && (() => {
        const nopeChain = pa!.nopeChain || [];
        const cardPlayed = pa!.cardPlayed || 'nope';
        const sourcePlayer = game.players.find(p => p.id === pa!.sourcePlayerId);
        const myNopeCards = myPlayer?.hand.filter(c => c.type === 'nope') || [];
        const canNope = myNopeCards.length > 0 && pa!.sourcePlayerId !== playerId;
        const timeLeft = Math.max(0, (pa!.expiresAt! - Date.now()) / 1000);

        return (
          <motion.div
            key="nope-window"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-surface/95 backdrop-blur-xl border-2 border-[#888] rounded-2xl p-4 shadow-[0_0_30px_rgba(136,136,136,0.3)]">
              {/* Countdown ring + header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                    <motion.circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke={timeLeft <= 2 ? '#ff3355' : '#888888'}
                      strokeWidth="2.5" strokeLinecap="round"
                      initial={{ strokeDasharray: '97.4 97.4' }}
                      animate={{ strokeDasharray: `${(timeLeft / 5) * 97.4} 97.4` }}
                      transition={{ duration: 0.1, ease: 'linear' }}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${timeLeft <= 2 ? 'text-danger animate-pulse' : 'text-text'}`}>
                    {Math.ceil(timeLeft)}
                  </span>
                </div>
                <span className="text-2xl">✋</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">
                    {sourcePlayer?.name} played {CARD_INFO[cardPlayed]?.emoji} {CARD_INFO[cardPlayed]?.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {nopeChain.length === 0 ? 'Anyone can Nope!' : `${nopeChain.length} Nope${nopeChain.length > 1 ? 's' : ''} in chain`}
                  </p>
                </div>
              </div>

              {/* Nope chain visualization */}
              {nopeChain.length > 0 && (
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="px-2 py-1 rounded-lg bg-surface-light text-text-muted">
                      {CARD_INFO[cardPlayed]?.emoji} {CARD_INFO[cardPlayed]?.name}
                    </span>
                    {nopeChain.map((noperId, i) => {
                      const noper = game.players.find(p => p.id === noperId);
                      return (
                        <span key={i} className="flex items-center gap-1">
                          <span className="text-text-muted">&gt;</span>
                          <span className={`px-2 py-1 rounded-lg font-bold ${i % 2 === 0 ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                            ✋ {noper?.name}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Result preview */}
              <p className="text-xs text-center mb-3">
                {nopeChain.length % 2 === 0
                  ? <span className="text-success">Action will proceed</span>
                  : <span className="text-danger">Action is cancelled</span>
                }
              </p>

              {/* Action buttons */}
              {canNope ? (
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => onNope(myNopeCards[0].id)}
                    className="flex-1 py-2.5 rounded-xl bg-[#888] text-white font-bold text-sm animate-pulse"
                  >
                    NOPE! ({myNopeCards.length})
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={onPass}
                    className="flex-1 py-2.5 rounded-xl bg-surface-light text-text-muted font-bold text-sm"
                  >
                    Pass
                  </motion.button>
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center">
                  {pa!.sourcePlayerId === playerId ? 'Waiting for other players...' : 'You have no Nope cards'}
                </p>
              )}
            </div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
