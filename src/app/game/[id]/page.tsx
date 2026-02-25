'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { GameState, Card, CardType, Player } from '@/types/game';
import { CARD_INFO, CAT_CARD_TYPES } from '@/types/game';
import GameCard from '@/components/game/GameCard';
import PlayerHand from '@/components/game/PlayerHand';
import OpponentBar from '@/components/game/OpponentBar';
import DrawPile from '@/components/game/DrawPile';
import DiscardPile from '@/components/game/DiscardPile';
import GameLog from '@/components/game/GameLog';
import ThreeOfKindModal from '@/components/game/ThreeOfKindModal';
import DangerMeter from '@/components/game/DangerMeter';
import SoundToggle from '@/components/game/SoundToggle';
import QuickEmotes from '@/components/game/QuickEmotes';
import { sounds } from '@/lib/sounds';
import { launchConfetti, launchExplosionParticles } from '@/lib/confetti';
import { recordWin, recordLoss, recordExplosion, recordCardPlayed } from '@/lib/stats';

const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'];

function isCatCard(type: CardType): boolean {
  return CAT_CARD_TYPES.includes(type);
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSeeFuture, setShowSeeFuture] = useState(false);
  const [seeFutureCards, setSeeFutureCards] = useState<Card[]>([]);
  const [showDefuseModal, setShowDefuseModal] = useState(false);
  const [defusePosition, setDefusePosition] = useState(0);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [selectingThreeTarget, setSelectingThreeTarget] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const lastActionIdRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<HTMLCanvasElement>(null);
  const hasRecordedResult = useRef(false);

  const myPlayer = game?.players.find(p => p.id === playerId);
  const currentPlayer = game ? game.players[game.currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const hasPendingAction = game?.pendingAction !== null;
  const isPendingOnMe = game?.pendingAction?.playerId === playerId;
  const alivePlayers = game?.players.filter(p => p.isAlive).length ?? 0;

  // Load game state
  const fetchGame = useCallback(async (pid?: string) => {
    try {
      const id = pid || playerId;
      if (!id) return;
      const res = await fetch(`/api/games/${gameId}?playerId=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGame(data.game);
      lastActionIdRef.current = data.game.lastActionId;
      handlePendingAction(data.game, id);
      if (data.game.status === 'finished') setShowWinner(true);
    } catch (err: unknown) {
      console.error('Fetch game error:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId]);

  function handlePendingAction(g: GameState, pid: string) {
    if (!g.pendingAction || g.pendingAction.playerId !== pid) return;
    switch (g.pendingAction.type) {
      case 'see_future':
        setSeeFutureCards(g.pendingAction.cards || []);
        setShowSeeFuture(true);
        sounds?.seeFuture();
        break;
      case 'defuse_place':
        setShowDefuseModal(true);
        sounds?.defuse();
        break;
      case 'steal_target':
        setSelectingTarget(true);
        break;
      case 'three_of_kind_target':
        setSelectingThreeTarget(true);
        break;
      case 'favor_give':
        toast('Someone asked for a Favor! Tap a card to give.');
        sounds?.favor();
        break;
    }
  }

  // Poll for updates
  const poll = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(
        `/api/games/${gameId}/poll?playerId=${playerId}&lastActionId=${lastActionIdRef.current}`
      );
      const data = await res.json();
      if (!data.changed || !data.game) return;

      const oldGame = game;
      setGame(data.game);
      lastActionIdRef.current = data.lastActionId;

      // Detect events from state changes
      if (oldGame) {
        for (const p of data.game.players) {
          const oldP = oldGame.players.find(op => op.id === p.id);
          if (oldP?.isAlive && !p.isAlive) {
            triggerExplosion();
            if (p.id === playerId) {
              recordExplosion();
            }
          }
        }
      }

      handlePendingAction(data.game, playerId);

      if (data.game.status === 'finished') {
        handleGameEnd(data.game);
      }
    } catch {
      // Silent
    }
  }, [gameId, playerId, game]);

  function triggerExplosion() {
    setShowExplosion(true);
    sounds?.explosion();
    if (particleRef.current) {
      launchExplosionParticles(particleRef.current, window.innerWidth / 2, window.innerHeight / 2);
    }
    setTimeout(() => setShowExplosion(false), 1800);
  }

  function handleGameEnd(g: GameState) {
    setShowWinner(true);
    if (hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    if (g.winnerId === playerId) {
      sounds?.win();
      recordWin();
      setTimeout(() => {
        if (confettiRef.current) launchConfetti(confettiRef.current);
      }, 300);
    } else {
      sounds?.lose();
      recordLoss();
    }
  }

  // Initialize
  useEffect(() => {
    const pid = localStorage.getItem(`ek_player_${gameId}`);
    if (!pid) {
      router.push('/');
      return;
    }
    setPlayerId(pid);
    fetchGame(pid);
  }, [gameId, fetchGame, router]);

  // Polling
  useEffect(() => {
    if (!playerId || !game) return;
    pollIntervalRef.current = setInterval(poll, 1500);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [playerId, poll, game]);

  // Play turn-start sound
  useEffect(() => {
    if (isMyTurn && game?.status === 'playing') {
      sounds?.turnStart();
    }
  }, [isMyTurn, game?.currentPlayerIndex]);

  // Send action
  async function sendAction(actionData: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...actionData, playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGame(data.game);
      lastActionIdRef.current = data.game.lastActionId;
      setSelectedCards([]);

      // Sound based on action type
      if (actionData.type === 'play_card') {
        sounds?.cardPlay();
        recordCardPlayed();
      } else if (actionData.type === 'draw') {
        sounds?.cardDraw();
      }

      // Detect self-explosion
      const me = data.game.players.find((p: Player) => p.id === playerId);
      if (me && !me.isAlive) {
        triggerExplosion();
        recordExplosion();
      }

      handlePendingAction(data.game, playerId);

      if (data.game.status === 'finished') {
        handleGameEnd(data.game);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  function handleCardClick(card: Card) {
    if (game?.pendingAction?.type === 'favor_give' && isPendingOnMe) {
      sendAction({ type: 'favor_give', cardId: card.id });
      return;
    }

    sounds?.click();

    if (isCatCard(card.type)) {
      setSelectedCards(prev => {
        if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
        const currentType = prev.length > 0 ? myPlayer?.hand.find(c => c.id === prev[0])?.type : null;
        if (currentType && currentType !== card.type) return [card.id];
        if (prev.length >= 3) return prev;
        return [...prev, card.id];
      });
    } else {
      setSelectedCards(prev => prev.includes(card.id) ? [] : [card.id]);
    }
  }

  function playSelected() {
    if (selectedCards.length === 0) return;
    const card = myPlayer?.hand.find(c => c.id === selectedCards[0]);
    if (!card) return;

    if (selectedCards.length >= 2 && isCatCard(card.type)) {
      sendAction({ type: 'play_card', cardId: selectedCards[0], cardIds: selectedCards });
      return;
    }

    if (card.type === 'favor') {
      setSelectingTarget(true);
      return;
    }

    sendAction({ type: 'play_card', cardId: card.id });
  }

  function drawCard() {
    if (!isMyTurn || hasPendingAction || actionLoading) return;
    sendAction({ type: 'draw' });
  }

  function handleThreeOfKindSelect(targetId: string, cardType: CardType) {
    sendAction({ type: 'three_of_kind_target', targetPlayerId: targetId, targetCardType: cardType });
    setSelectingThreeTarget(false);
  }

  function handleTargetSelect(targetId: string) {
    if (game?.pendingAction?.type === 'steal_target') {
      sendAction({ type: 'steal_target', targetPlayerId: targetId });
      setSelectingTarget(false);
      sounds?.steal();
      return;
    }
    const selectedCard = myPlayer?.hand.find(c => c.id === selectedCards[0]);
    if (selectedCard?.type === 'favor') {
      sendAction({ type: 'play_card', cardId: selectedCard.id, targetPlayerId: targetId });
      setSelectingTarget(false);
      setSelectedCards([]);
      return;
    }
    setSelectingTarget(false);
  }

  async function startMultiplayerGame() {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGame(data.game);
      lastActionIdRef.current = data.game.lastActionId;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start');
    }
  }

  function handleEmote(emote: string) {
    setFloatingEmote(emote);
  }

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <p className="text-xl">Game not found</p>
        <button onClick={() => router.push('/')} className="text-accent hover:underline">Go Home</button>
      </div>
    );
  }

  // Waiting lobby
  if (game.status === 'waiting') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
          <h2 className="text-3xl font-bold mb-2">Waiting for Players</h2>
          <p className="text-text-muted mb-6">Share this code with friends:</p>

          <motion.div className="bg-surface-light border-2 border-accent rounded-2xl p-6 mb-6" animate={{ borderColor: ['#ff6b35', '#ff8855', '#ff6b35'] }} transition={{ duration: 2, repeat: Infinity }}>
            <p className="text-5xl font-mono font-black tracking-[0.4em] text-accent">{game.code}</p>
          </motion.div>

          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => { navigator.clipboard.writeText(game.code); toast.success('Code copied!'); }} className="text-accent hover:underline text-sm">Copy Code</button>
            <span className="text-border">|</span>
            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '?join=' + game.code); toast.success('Link copied!'); }} className="text-accent hover:underline text-sm">Copy Invite Link</button>
          </div>

          <div className="space-y-2 mb-8">
            <p className="text-sm text-text-muted">Players ({game.players.length}/5):</p>
            {game.players.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 bg-surface-light rounded-xl p-3">
                <span className="text-2xl">{AVATARS[p.avatar]}</span>
                <span className="font-bold">{p.name}</span>
                {p.id === game.hostId && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">Host</span>
                )}
              </motion.div>
            ))}
          </div>

          {game.hostId === playerId && game.players.length >= 2 && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startMultiplayerGame} className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold text-lg shadow-lg shadow-accent/20">
              Start Game ({game.players.length} players)
            </motion.button>
          )}

          {game.hostId !== playerId && (
            <p className="text-text-muted animate-pulse">Waiting for host to start...</p>
          )}
        </motion.div>
      </div>
    );
  }

  // --- ACTIVE GAME ---
  const selectableTargets = selectingTarget
    ? game.players.filter(p => p.isAlive && p.id !== playerId && p.hand.length > 0).map(p => p.id)
    : undefined;

  const selectedCard = selectedCards.length > 0 ? myPlayer?.hand.find(c => c.id === selectedCards[0]) : null;
  const canPlayPair = selectedCards.length === 2 && selectedCard && isCatCard(selectedCard.type);
  const canPlayTriple = selectedCards.length === 3 && selectedCard && isCatCard(selectedCard.type);
  const canPlaySingle = selectedCards.length === 1 && selectedCard && !isCatCard(selectedCard.type) && selectedCard.type !== 'exploding_kitten' && selectedCard.type !== 'defuse';
  const canPlay = isMyTurn && !hasPendingAction && (canPlaySingle || canPlayPair || canPlayTriple) && !actionLoading;
  const favorGiveMode = game.pendingAction?.type === 'favor_give' && isPendingOnMe;

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative">
      {/* Particle canvases */}
      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none z-[60]" />
      <canvas ref={particleRef} className="fixed inset-0 pointer-events-none z-[55]" />

      {/* Explosion overlay */}
      <AnimatePresence>
        {showExplosion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-danger/20" />
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 2.5, 0] }} transition={{ duration: 1.5, times: [0, 0.4, 1] }} className="text-[120px]">
              💥
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner modal */}
      <AnimatePresence>
        {showWinner && game.winnerId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-surface rounded-3xl p-8 text-center max-w-sm w-full border-2 border-warning shadow-2xl">
              <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }} className="text-7xl mb-4">
                {game.winnerId === playerId ? '🏆' : '💀'}
              </motion.div>
              <h2 className="text-3xl font-black mb-2">
                {game.winnerId === playerId ? 'You Win!' : `${game.players.find(p => p.id === game.winnerId)?.name} Wins!`}
              </h2>
              <p className="text-text-muted mb-8">
                {game.winnerId === playerId ? 'You survived all the Exploding Kittens!' : 'Better luck next time!'}
              </p>
              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/')} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold">
                  Play Again
                </motion.button>
                <button onClick={() => setShowWinner(false)} className="px-4 py-3 rounded-xl bg-surface-light border border-border text-text-muted font-bold">
                  View Board
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* See the Future modal */}
      <AnimatePresence>
        {showSeeFuture && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 border-[#FF44AA]">
              <p className="text-4xl mb-2">🔮</p>
              <h3 className="text-xl font-bold mb-1">The Future</h3>
              <p className="text-xs text-text-muted mb-4">Top of the deck (drawn first → last):</p>
              <div className="flex justify-center gap-3 mb-6">
                {seeFutureCards.map((card, i) => (
                  <div key={i} className="text-center">
                    <GameCard card={card} size="md" disabled index={i} />
                    <p className="text-xs text-text-muted mt-1">#{i + 1}</p>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowSeeFuture(false); sendAction({ type: 'see_future_ack' }); }} className="w-full py-3 rounded-xl bg-[#FF44AA] text-white font-bold">
                Got it!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Defuse placement modal */}
      <AnimatePresence>
        {showDefuseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 border-success">
              <p className="text-4xl mb-2">🔧💣</p>
              <h3 className="text-xl font-bold mb-2">Defused!</h3>
              <p className="text-sm text-text-muted mb-1">Place the Exploding Kitten back in the deck.</p>
              <p className="text-xs text-text-muted mb-4">Top = next person draws it. Bottom = buried deep.</p>

              {/* Visual deck position */}
              <div className="flex items-center justify-center gap-1 mb-3 h-8">
                {Array.from({ length: Math.min(game.deck.length + 1, 20) }).map((_, i) => {
                  const pos = Math.round((i / Math.min(game.deck.length, 19)) * game.deck.length);
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all ${pos === defusePosition ? 'bg-danger h-8' : 'bg-border h-4'}`}
                    />
                  );
                })}
              </div>

              <input type="range" min={0} max={game.deck.length} value={defusePosition} onChange={e => setDefusePosition(Number(e.target.value))} className="w-full mb-2 accent-success" />
              <p className="text-sm text-text-muted mb-4">
                Position: <span className="font-bold text-success">{defusePosition}</span> of {game.deck.length}
                {defusePosition <= 1 ? <span className="text-danger ml-1">(Evil!)</span> : defusePosition >= game.deck.length - 1 ? <span className="text-success ml-1">(Safe for now)</span> : ''}
              </p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowDefuseModal(false); sendAction({ type: 'defuse_place', position: defusePosition }); setDefusePosition(0); }} className="w-full py-3 rounded-xl bg-success text-white font-bold">
                Place It!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Three of a Kind modal */}
      <ThreeOfKindModal
        show={selectingThreeTarget}
        targets={game.players.filter(p => p.isAlive && p.id !== playerId && p.hand.length > 0)}
        onSelect={handleThreeOfKindSelect}
        onCancel={() => setSelectingThreeTarget(false)}
      />

      {/* Top bar */}
      <div className="bg-surface/95 backdrop-blur-md border-b border-border px-2 py-2 flex items-center gap-2">
        <div className="flex-1 overflow-x-auto">
          <OpponentBar
            players={game.players}
            currentPlayerId={currentPlayer?.id || ''}
            myId={playerId}
            onPlayerClick={selectableTargets ? handleTargetSelect : undefined}
            selectablePlayerIds={selectableTargets}
          />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <SoundToggle />
          <QuickEmotes onEmote={handleEmote} />
        </div>
      </div>

      {/* Targeting banners */}
      <AnimatePresence>
        {selectingTarget && !selectingThreeTarget && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-warning/20 border-b border-warning/30 px-4 py-2 text-center text-warning font-bold text-sm">
            Select a player to steal a random card!
            <button onClick={() => setSelectingTarget(false)} className="ml-3 text-text-muted hover:text-text text-xs underline">Cancel</button>
          </motion.div>
        )}
        {favorGiveMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#AA44FF]/20 border-b border-[#AA44FF]/30 px-4 py-2 text-center text-[#AA44FF] font-bold text-sm animate-pulse">
            Someone asked for a Favor! Tap a card to give it.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Eliminated overlay */}
      {myPlayer && !myPlayer.isAlive && game.status === 'playing' && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center">
          <div className="text-center">
            <p className="text-6xl mb-4">💀</p>
            <p className="text-2xl font-bold text-danger mb-2">You Exploded!</p>
            <p className="text-text-muted mb-4">Watching the game...</p>
            <button onClick={() => router.push('/')} className="px-6 py-2 rounded-xl bg-surface-light border border-border text-text hover:border-accent transition-colors">Leave Game</button>
          </div>
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3 overflow-hidden relative">
        {/* Floating emote */}
        <AnimatePresence>
          {floatingEmote && (
            <motion.div
              key={floatingEmote + Date.now()}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 2, y: -60 }}
              exit={{ opacity: 0, y: -120 }}
              transition={{ duration: 1.5 }}
              onAnimationComplete={() => setFloatingEmote(null)}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 text-5xl pointer-events-none z-20"
            >
              {floatingEmote}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Turn indicator + Danger meter */}
        <div className="flex items-center gap-3">
          <motion.div
            key={game.currentPlayerIndex}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center px-4 py-1.5 rounded-full text-sm font-bold ${
              isMyTurn ? 'bg-accent/20 text-accent' : 'bg-surface-light text-text-muted'
            }`}
          >
            {isMyTurn ? (
              <>Your Turn! {game.turnsRemaining > 1 && <span className="text-warning">({game.turnsRemaining} turns)</span>}</>
            ) : (
              <span className="flex items-center gap-2">
                {currentPlayer?.name}&apos;s Turn
                {currentPlayer?.isAI && actionLoading && <span className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />}
                {game.turnsRemaining > 1 && <span className="text-warning">({game.turnsRemaining})</span>}
              </span>
            )}
          </motion.div>
          <DangerMeter deckSize={game.deck.length} alivePlayers={alivePlayers} />
        </div>

        {/* Draw & Discard piles */}
        <div className="flex items-center gap-6 md:gap-10">
          <DrawPile count={game.deck.length} onClick={drawCard} disabled={actionLoading || hasPendingAction} isMyTurn={isMyTurn} />
          <DiscardPile cards={game.discardPile} />
        </div>

        {/* Game log toggle */}
        <button onClick={() => setShowLog(!showLog)} className="text-xs text-text-muted hover:text-accent transition-colors">
          {showLog ? 'Hide Log ▲' : `Game Log (${game.logs.length}) ▼`}
        </button>
        <AnimatePresence>
          {showLog && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full max-w-lg overflow-hidden">
              <GameLog logs={game.logs} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar: player info + hand */}
      <div className="bg-surface/95 backdrop-blur-md border-t border-border">
        {/* My info + actions */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{AVATARS[myPlayer?.avatar || 0]}</span>
            <div>
              <p className={`font-bold text-sm leading-none ${myPlayer && !myPlayer.isAlive ? 'line-through text-danger' : ''}`}>
                {myPlayer?.name || 'You'}
              </p>
              <p className="text-[10px] text-text-muted">
                {myPlayer?.isAlive ? `${myPlayer?.hand.length} cards` : 'Eliminated'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selected card info */}
            {selectedCard && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-light/80 border border-border">
                <span className="text-sm">{CARD_INFO[selectedCard.type].emoji}</span>
                <span className="text-[10px] text-text-muted max-w-[100px] truncate">{CARD_INFO[selectedCard.type].description}</span>
              </motion.div>
            )}

            {canPlay && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={playSelected}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold text-sm shadow-lg shadow-accent/20 whitespace-nowrap"
              >
                {canPlayPair ? 'Steal (Pair)' : canPlayTriple ? 'Steal (Triple)' : `Play`}
              </motion.button>
            )}
            {selectedCards.length > 0 && (
              <button onClick={() => setSelectedCards([])} className="px-2 py-2 rounded-lg bg-surface-light text-text-muted text-xs">✕</button>
            )}
          </div>
        </div>

        {/* Hand */}
        <div className="pb-3 safe-bottom">
          <PlayerHand
            cards={myPlayer?.hand || []}
            selectedCards={selectedCards}
            onCardClick={handleCardClick}
            disabled={(!isMyTurn && !favorGiveMode && !isPendingOnMe) || actionLoading}
          />
        </div>
      </div>
    </div>
  );
}
