'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '@/types/game';

interface Props {
  show: boolean;
  game: GameState;
  defusePosition: number;
  defuseCountdown: number;
  onPositionChange: (pos: number) => void;
  onPlace: () => void;
}

export default function DefusePlaceModal({
  show,
  game,
  defusePosition,
  defuseCountdown,
  onPositionChange,
  onPlace,
}: Props) {
  const isIK = game.pendingAction?.type === 'imploding_kitten_place';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            className={`bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 relative overflow-hidden ${
              isIK ? 'border-[#7B2FBE]' : 'border-success'
            }`}
          >
            {/* Countdown ring */}
            <div className="absolute top-3 right-3 w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={defuseCountdown <= 3 ? '#ff3355' : (isIK ? '#aa44ff' : '#2bd47c')}
                  strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${(defuseCountdown / 10) * 97.4} 97.4`}
                  className="transition-all duration-100"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${defuseCountdown <= 3 ? 'text-danger' : 'text-text'}`}>
                {Math.ceil(defuseCountdown)}
              </span>
            </div>

            {isIK ? (
              <>
                <p className="text-4xl mb-2">☢️</p>
                <h3 className="text-xl font-bold mb-1" style={{ color: '#aa44ff' }}>Imploding Kitten!</h3>
                <p className="text-sm text-text-muted mb-4">
                  Place it back <strong>face-up</strong> in the deck. Everyone can see it coming!
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-2">🔧💣</p>
                <h3 className="text-xl font-bold mb-1">Defused!</h3>
                <p className="text-sm text-text-muted mb-4">Place the Exploding Kitten back in the deck.</p>
              </>
            )}

            {/* Quick-pick buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => onPositionChange(0)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  defusePosition === 0
                    ? 'bg-danger text-white ring-2 ring-danger/50'
                    : 'bg-surface-light text-text-muted hover:bg-danger/20 hover:text-danger'
                }`}
              >
                Top
                <span className="block text-[10px] font-normal opacity-70">Evil!</span>
              </button>
              <button
                onClick={() => onPositionChange(Math.floor(Math.random() * (game.deck.length + 1)))}
                className="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all bg-surface-light text-text-muted hover:bg-warning/20 hover:text-warning"
              >
                Random
                <span className="block text-[10px] font-normal opacity-70">Chaos</span>
              </button>
              <button
                onClick={() => onPositionChange(game.deck.length)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  defusePosition === game.deck.length
                    ? 'bg-success text-white ring-2 ring-success/50'
                    : 'bg-surface-light text-text-muted hover:bg-success/20 hover:text-success'
                }`}
              >
                Bottom
                <span className="block text-[10px] font-normal opacity-70">Safe</span>
              </button>
            </div>

            {/* Visual deck preview */}
            <div className="relative mb-3 px-2">
              <div className="flex items-end justify-center gap-[2px] h-16">
                {(() => {
                  const deckLen = game.deck.length;
                  const maxSlots = Math.min(deckLen + 1, 24);
                  return Array.from({ length: maxSlots }).map((_, i) => {
                    const pos = maxSlots <= deckLen + 1 ? i : Math.round((i / (maxSlots - 1)) * deckLen);
                    const isInsertPoint = pos === defusePosition;
                    const isNearInsert = Math.abs(pos - defusePosition) <= 1;
                    return (
                      <button
                        key={i}
                        onClick={() => onPositionChange(pos)}
                        className={`rounded-sm transition-all cursor-pointer ${
                          isInsertPoint
                            ? 'bg-danger w-2.5 h-14 shadow-[0_0_12px_rgba(255,51,85,0.6)] animate-pulse'
                            : isNearInsert
                              ? 'bg-warning/60 w-1.5 h-10'
                              : 'bg-border/60 w-1 h-6 hover:bg-border hover:h-8'
                        }`}
                      />
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
                <span>Top</span>
                <span>Bottom</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={game.deck.length}
              value={defusePosition}
              onChange={e => onPositionChange(Number(e.target.value))}
              className="w-full mb-2 accent-success"
            />
            <p className="text-sm text-text-muted mb-4">
              Position: <span className="font-bold text-success">{defusePosition}</span> of {game.deck.length}
              {defusePosition === 0 ? (
                <span className="text-danger ml-1">(Next player draws it!)</span>
              ) : defusePosition <= 2 ? (
                <span className="text-danger ml-1">(Evil!)</span>
              ) : defusePosition >= game.deck.length ? (
                <span className="text-success ml-1">(Buried deep)</span>
              ) : defusePosition >= game.deck.length - 2 ? (
                <span className="text-success ml-1">(Safe for now)</span>
              ) : null}
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlace}
              className={`w-full py-3 rounded-xl text-white font-bold text-base ${isIK ? 'bg-[#7B2FBE]' : 'bg-success'}`}
            >
              Place It!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
