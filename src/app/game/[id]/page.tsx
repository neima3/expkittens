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
  const [showSeeeFuture, setShowSeeFuture] = useState(false);
  const [seeFutureCards, setSeeFutureCards] = useState<Card[]>([]);
  const [showDefuseModal, setShowDefuseModal] = useState(false);
  const [defusePosition, setDefusePosition] = useState(0);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [selectingThreeTarget, setSelectingThreeTarget] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const lastActionIdRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myPlayer = game?.players.find(p => p.id === playerId);
  const currentPlayer = game ? game.players[game.currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const hasPendingAction = game?.pendingAction !== null;
  const isPendingOnMe = game?.pendingAction?.playerId === playerId;

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

      // Handle pending see future
      if (data.game.pendingAction?.type === 'see_future' && data.game.pendingAction.playerId === id) {
        setSeeFutureCards(data.game.pendingAction.cards || []);
        setShowSeeFuture(true);
      }

      // Handle defuse placement
      if (data.game.pendingAction?.type === 'defuse_place' && data.game.pendingAction.playerId === id) {
        setShowDefuseModal(true);
      }

      // Handle steal target selection
      if (data.game.pendingAction?.type === 'steal_target' && data.game.pendingAction.playerId === id) {
        setSelectingTarget(true);
      }

      // Handle three of a kind target
      if (data.game.pendingAction?.type === 'three_of_kind_target' && data.game.pendingAction.playerId === id) {
        setSelectingThreeTarget(true);
      }

      // Show winner
      if (data.game.status === 'finished') {
        setShowWinner(true);
      }
    } catch (err: unknown) {
      console.error('Fetch game error:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId]);

  // Poll for updates (multiplayer)
  const poll = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(
        `/api/games/${gameId}/poll?playerId=${playerId}&lastActionId=${lastActionIdRef.current}`
      );
      const data = await res.json();
      if (data.changed && data.game) {
        const oldGame = game;
        setGame(data.game);
        lastActionIdRef.current = data.lastActionId;

        // Detect explosions
        if (oldGame) {
          for (const p of data.game.players) {
            const oldP = oldGame.players.find(op => op.id === p.id);
            if (oldP?.isAlive && !p.isAlive) {
              setShowExplosion(true);
              setTimeout(() => setShowExplosion(false), 1500);
            }
          }
        }

        // Handle pending actions on me
        if (data.game.pendingAction?.playerId === playerId) {
          if (data.game.pendingAction.type === 'see_future') {
            setSeeFutureCards(data.game.pendingAction.cards || []);
            setShowSeeFuture(true);
          } else if (data.game.pendingAction.type === 'defuse_place') {
            setShowDefuseModal(true);
          } else if (data.game.pendingAction.type === 'steal_target') {
            setSelectingTarget(true);
          } else if (data.game.pendingAction.type === 'three_of_kind_target') {
            setSelectingThreeTarget(true);
          } else if (data.game.pendingAction.type === 'favor_give') {
            toast('A player asked you for a Favor! Select a card to give.');
          }
        }

        if (data.game.status === 'finished') {
          setShowWinner(true);
        }
      }
    } catch {
      // Silent poll failures
    }
  }, [gameId, playerId, game]);

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

  // Start polling
  useEffect(() => {
    if (!playerId || !game) return;
    pollIntervalRef.current = setInterval(poll, 1500);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [playerId, poll, game]);

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

      // Check for explosion
      if (data.game.players.find((p: Player) => p.id === playerId && !p.isAlive)) {
        setShowExplosion(true);
        setTimeout(() => setShowExplosion(false), 1500);
      }

      // Handle pending actions
      if (data.game.pendingAction?.playerId === playerId) {
        if (data.game.pendingAction.type === 'see_future') {
          setSeeFutureCards(data.game.pendingAction.cards || []);
          setShowSeeFuture(true);
        } else if (data.game.pendingAction.type === 'defuse_place') {
          setShowDefuseModal(true);
        }
      }

      if (data.game.status === 'finished') {
        setShowWinner(true);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  // Card click handler
  function handleCardClick(card: Card) {
    // If we need to give a card for favor
    if (game?.pendingAction?.type === 'favor_give' && isPendingOnMe) {
      sendAction({ type: 'favor_give', cardId: card.id });
      return;
    }

    // Toggle selection for pairs
    if (isCatCard(card.type)) {
      setSelectedCards(prev => {
        if (prev.includes(card.id)) {
          return prev.filter(id => id !== card.id);
        }
        // Only allow selecting same type
        const currentType = prev.length > 0
          ? myPlayer?.hand.find(c => c.id === prev[0])?.type
          : null;
        if (currentType && currentType !== card.type) {
          return [card.id]; // reset to new type
        }
        if (prev.length >= 3) return prev;
        return [...prev, card.id];
      });
    } else {
      setSelectedCards(prev =>
        prev.includes(card.id) ? [] : [card.id]
      );
    }
  }

  // Play selected cards
  function playSelected() {
    if (selectedCards.length === 0) return;
    const card = myPlayer?.hand.find(c => c.id === selectedCards[0]);
    if (!card) return;

    if (selectedCards.length >= 2 && isCatCard(card.type)) {
      // Playing pair or triple
      if (selectedCards.length === 2) {
        sendAction({
          type: 'play_card',
          cardId: selectedCards[0],
          cardIds: selectedCards,
        });
      } else if (selectedCards.length === 3) {
        sendAction({
          type: 'play_card',
          cardId: selectedCards[0],
          cardIds: selectedCards,
        });
      }
      return;
    }

    // Single card
    if (card.type === 'favor') {
      // Need to select target
      setSelectingTarget(true);
      return;
    }

    sendAction({ type: 'play_card', cardId: card.id });
  }

  // Draw card
  function drawCard() {
    if (!isMyTurn || hasPendingAction || actionLoading) return;
    sendAction({ type: 'draw' });
  }

  // Handle target player selection
  function handleTargetSelect(targetId: string) {
    if (selectingThreeTarget) {
      // Need to also pick a card type - just ask for defuse for simplicity
      // TODO: show card type picker
      sendAction({
        type: 'three_of_kind_target',
        targetPlayerId: targetId,
        targetCardType: 'defuse',
      });
      setSelectingThreeTarget(false);
      return;
    }

    if (game?.pendingAction?.type === 'steal_target') {
      sendAction({ type: 'steal_target', targetPlayerId: targetId });
      setSelectingTarget(false);
      return;
    }

    // Favor target
    const selectedCard = myPlayer?.hand.find(c => c.id === selectedCards[0]);
    if (selectedCard?.type === 'favor') {
      sendAction({ type: 'play_card', cardId: selectedCard.id, targetPlayerId: targetId });
      setSelectingTarget(false);
      setSelectedCards([]);
      return;
    }

    setSelectingTarget(false);
  }

  // Start multiplayer game (host)
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

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <p className="text-xl">Game not found</p>
        <button onClick={() => router.push('/')} className="text-accent hover:underline">
          Go Home
        </button>
      </div>
    );
  }

  // Waiting lobby
  if (game.status === 'waiting') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <h2 className="text-3xl font-bold mb-2">Waiting for Players</h2>
          <p className="text-text-muted mb-6">Share this code with friends:</p>

          <motion.div
            className="bg-surface-light border-2 border-accent rounded-2xl p-6 mb-6"
            animate={{ borderColor: ['#ff6b35', '#ff8855', '#ff6b35'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-5xl font-mono font-black tracking-[0.4em] text-accent">
              {game.code}
            </p>
          </motion.div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(game.code);
              toast.success('Code copied!');
            }}
            className="text-accent hover:underline mb-8 text-sm"
          >
            Copy to clipboard
          </button>

          <div className="space-y-2 mb-8">
            <p className="text-sm text-text-muted">Players ({game.players.length}/5):</p>
            {game.players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-surface-light rounded-xl p-3">
                <span className="text-2xl">{AVATARS[p.avatar]}</span>
                <span className="font-bold">{p.name}</span>
                {p.id === game.hostId && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>

          {game.hostId === playerId && game.players.length >= 2 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startMultiplayerGame}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold text-lg shadow-lg shadow-accent/20"
            >
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

  // Active game
  const selectableTargets = selectingTarget || selectingThreeTarget
    ? game.players.filter(p => p.isAlive && p.id !== playerId && p.hand.length > 0).map(p => p.id)
    : undefined;

  const canPlay = isMyTurn && !hasPendingAction && selectedCards.length > 0 && !actionLoading;
  const selectedCard = selectedCards.length > 0 ? myPlayer?.hand.find(c => c.id === selectedCards[0]) : null;
  const canPlayPair = selectedCards.length === 2 && selectedCard && isCatCard(selectedCard.type);
  const canPlayTriple = selectedCards.length === 3 && selectedCard && isCatCard(selectedCard.type);
  const canPlaySingle = selectedCards.length === 1 && selectedCard && !isCatCard(selectedCard.type) && selectedCard.type !== 'exploding_kitten';

  // If pending favor_give on me, show instructions
  const favorGiveMode = game.pendingAction?.type === 'favor_give' && isPendingOnMe;

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative">
      {/* Explosion overlay */}
      <AnimatePresence>
        {showExplosion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-danger/30 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 3, 0] }}
              transition={{ duration: 1.2 }}
              className="text-9xl"
            >
              💥
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner modal */}
      <AnimatePresence>
        {showWinner && game.winnerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface rounded-3xl p-8 text-center max-w-sm w-full border-2 border-warning"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="text-7xl mb-4"
              >
                🏆
              </motion.div>
              <h2 className="text-3xl font-black mb-2">
                {game.players.find(p => p.id === game.winnerId)?.name}
              </h2>
              <p className="text-xl text-warning font-bold mb-6">Wins!</p>
              <p className="text-text-muted mb-8">The last kitten standing!</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="w-full py-3 rounded-xl bg-accent text-white font-bold"
              >
                Play Again
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* See the Future modal */}
      <AnimatePresence>
        {showSeeeFuture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 border-[#FF44AA]"
            >
              <p className="text-4xl mb-2">🔮</p>
              <h3 className="text-xl font-bold mb-4">The Future</h3>
              <p className="text-sm text-text-muted mb-4">Top of the deck (drawn first → last):</p>
              <div className="flex justify-center gap-3 mb-6">
                {seeFutureCards.map((card, i) => (
                  <div key={i} className="text-center">
                    <GameCard card={card} size="md" disabled index={i} />
                    <p className="text-xs text-text-muted mt-1">#{i + 1}</p>
                  </div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowSeeFuture(false);
                  sendAction({ type: 'see_future_ack' });
                }}
                className="w-full py-3 rounded-xl bg-[#FF44AA] text-white font-bold"
              >
                Got it!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Defuse placement modal */}
      <AnimatePresence>
        {showDefuseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 border-success"
            >
              <p className="text-4xl mb-2">🔧💣</p>
              <h3 className="text-xl font-bold mb-2">Defused!</h3>
              <p className="text-sm text-text-muted mb-4">
                Place the Exploding Kitten back in the deck.
                <br />
                0 = top (next draw), {game.deck.length} = bottom
              </p>
              <input
                type="range"
                min={0}
                max={game.deck.length}
                value={defusePosition}
                onChange={e => setDefusePosition(Number(e.target.value))}
                className="w-full mb-2 accent-success"
              />
              <p className="text-sm text-text-muted mb-4">
                Position: <span className="font-bold text-success">{defusePosition}</span>
                {defusePosition === 0 ? ' (top - evil!)' : defusePosition === game.deck.length ? ' (bottom - safe)' : ''}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowDefuseModal(false);
                  sendAction({ type: 'defuse_place', position: defusePosition });
                  setDefusePosition(0);
                }}
                className="w-full py-3 rounded-xl bg-success text-white font-bold"
              >
                Place It!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar - opponents */}
      <div className="bg-surface/90 backdrop-blur border-b border-border px-2 py-2">
        <OpponentBar
          players={game.players}
          currentPlayerId={currentPlayer?.id || ''}
          myId={playerId}
          onPlayerClick={selectableTargets ? handleTargetSelect : undefined}
          selectablePlayerIds={selectableTargets}
        />
      </div>

      {/* Targeting instruction */}
      <AnimatePresence>
        {(selectingTarget || selectingThreeTarget) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-warning/20 border-b border-warning/30 px-4 py-2 text-center text-warning font-bold text-sm"
          >
            {selectingThreeTarget
              ? 'Select a player to steal a Defuse from!'
              : 'Select a player to steal a random card from!'}
            <button
              onClick={() => { setSelectingTarget(false); setSelectingThreeTarget(false); }}
              className="ml-2 text-text-muted hover:text-text text-xs"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favor give instruction */}
      <AnimatePresence>
        {favorGiveMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#AA44FF]/20 border-b border-[#AA44FF]/30 px-4 py-2 text-center text-[#AA44FF] font-bold text-sm"
          >
            Someone asked for a Favor! Tap a card to give it.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 overflow-hidden">
        {/* Turn indicator */}
        <motion.div
          key={game.currentPlayerIndex}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center px-4 py-1.5 rounded-full text-sm font-bold ${
            isMyTurn
              ? 'bg-accent/20 text-accent'
              : 'bg-surface-light text-text-muted'
          }`}
        >
          {isMyTurn ? 'Your Turn!' : `${currentPlayer?.name}'s Turn`}
          {game.turnsRemaining > 1 && (
            <span className="ml-1 text-warning">({game.turnsRemaining} turns left)</span>
          )}
        </motion.div>

        {/* Draw & Discard piles */}
        <div className="flex items-center gap-6 md:gap-10">
          <DrawPile
            count={game.deck.length}
            onClick={drawCard}
            disabled={actionLoading || hasPendingAction}
            isMyTurn={isMyTurn}
          />
          <DiscardPile cards={game.discardPile} />
        </div>

        {/* Game log */}
        <div className="w-full max-w-lg">
          <GameLog logs={game.logs} />
        </div>
      </div>

      {/* Player status bar */}
      <div className="bg-surface/90 backdrop-blur border-t border-border">
        {/* My info */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{AVATARS[myPlayer?.avatar || 0]}</span>
            <div>
              <p className="font-bold text-sm leading-none">{myPlayer?.name || 'You'}</p>
              <p className="text-xs text-text-muted">{myPlayer?.hand.length} cards</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {(canPlaySingle || canPlayPair || canPlayTriple) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playSelected}
                disabled={!canPlay}
                className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-sm disabled:opacity-50"
              >
                {canPlayPair ? 'Play Pair' : canPlayTriple ? 'Play Triple' : 'Play Card'}
              </motion.button>
            )}
            {selectedCards.length > 0 && (
              <button
                onClick={() => setSelectedCards([])}
                className="px-3 py-2 rounded-xl bg-surface-light text-text-muted text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* My hand */}
        <div className="pb-4 safe-bottom">
          <PlayerHand
            cards={myPlayer?.hand || []}
            selectedCards={selectedCards}
            onCardClick={handleCardClick}
            disabled={
              (!isMyTurn && !favorGiveMode && !isPendingOnMe) ||
              actionLoading
            }
          />
        </div>
      </div>
    </div>
  );
}
