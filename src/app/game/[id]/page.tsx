'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import StatsDisplay from '@/components/game/StatsDisplay';
import ComboCoach from '@/components/game/ComboCoach';
import { sounds } from '@/lib/sounds';
import { launchConfetti, launchExplosionParticles } from '@/lib/confetti';
import { recordWin, recordLoss, recordExplosion, recordCardPlayed, recordCardsStolen, recordDefuseUsed, getStats, getRankInfo, getLevelInfo } from '@/lib/stats';
import type { ProgressUpdate } from '@/lib/stats';

const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'];

function isCatCard(type: CardType): boolean {
  return CAT_CARD_TYPES.includes(type);
}

function getActionHint({
  isMyTurn,
  hasPendingAction,
  selectingTarget,
  selectingThreeTarget,
  favorGiveMode,
  canPlay,
  selectedCards,
  actionLoading,
}: {
  isMyTurn: boolean;
  hasPendingAction: boolean;
  selectingTarget: boolean;
  selectingThreeTarget: boolean;
  favorGiveMode: boolean;
  canPlay: boolean;
  selectedCards: string[];
  actionLoading: boolean;
}): string {
  if (actionLoading) return 'Resolving action...';
  if (favorGiveMode) return 'You owe a Favor. Pick one card from your hand to give.';
  if (selectingThreeTarget) return 'Pick a target and name a card to complete your triple combo.';
  if (selectingTarget) return 'Pick an opponent to steal from.';
  if (hasPendingAction) return 'Finish the current prompt to continue.';
  if (!isMyTurn) return 'Watch opponents and plan your next combo.';
  if (selectedCards.length === 0) return 'Select cards to play, or draw to end your turn.';
  if (canPlay) return 'You can play now or keep building a stronger combo.';
  return 'Selected cards are not a playable combo yet.';
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.id as string;
  const playerIdParam = searchParams.get('playerId');
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
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(2500);
  const [rankTitle, setRankTitle] = useState('Rookie Spark');
  const [levelInfo, setLevelInfo] = useState(() => getLevelInfo(getStats()));
  const [xpGain, setXpGain] = useState<number | null>(null);
  const lastActionIdRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xpGainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const explosionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<HTMLCanvasElement>(null);
  const hasRecordedResult = useRef(false);
  const gameRef = useRef<GameState | null>(null);
  const actionLoadingRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);

  // Keep refs in sync with state for use in poll callback
  gameRef.current = game;
  actionLoadingRef.current = actionLoading;

  const myPlayer = useMemo(() => game?.players.find(p => p.id === playerId), [game?.players, playerId]);
  const currentPlayer = useMemo(() => game ? game.players[game.currentPlayerIndex] : null, [game?.players, game?.currentPlayerIndex]);
  const isMyTurn = currentPlayer?.id === playerId;
  const hasPendingAction = !!game?.pendingAction;
  const isPendingOnMe = game?.pendingAction?.playerId === playerId;
  const alivePlayers = useMemo(() => game?.players.filter(p => p.isAlive).length ?? 0, [game?.players]);
  const selectedCard = useMemo(
    () => selectedCards.length > 0 ? myPlayer?.hand.find(c => c.id === selectedCards[0]) : null,
    [selectedCards, myPlayer?.hand]
  );
  const canPlayPair = selectedCards.length === 2 && !!selectedCard && isCatCard(selectedCard.type);
  const canPlayTriple = selectedCards.length === 3 && !!selectedCard && isCatCard(selectedCard.type);
  const canPlaySingle = selectedCards.length === 1 && !!selectedCard && !isCatCard(selectedCard.type) && selectedCard.type !== 'exploding_kitten' && selectedCard.type !== 'defuse';
  const canPlay = isMyTurn && !hasPendingAction && (canPlaySingle || canPlayPair || canPlayTriple) && !actionLoading;
  const favorGiveMode = game?.pendingAction?.type === 'favor_give' && isPendingOnMe;
  const actionHint = useMemo(() => getActionHint({
    isMyTurn,
    hasPendingAction,
    selectingTarget,
    selectingThreeTarget,
    favorGiveMode,
    canPlay,
    selectedCards,
    actionLoading,
  }), [isMyTurn, hasPendingAction, selectingTarget, selectingThreeTarget, favorGiveMode, canPlay, selectedCards, actionLoading]);

  const selectableTargets = useMemo(() =>
    selectingTarget && game
      ? game.players.filter(p => p.isAlive && p.id !== playerId && p.hand.length > 0).map(p => p.id)
      : undefined,
    [selectingTarget, game, playerId]
  );

  const applyProgressUpdate = useCallback((update: ProgressUpdate) => {
    if (update.gainedXp > 0) {
      setXpGain(update.gainedXp);
      if (xpGainTimerRef.current) clearTimeout(xpGainTimerRef.current);
      xpGainTimerRef.current = setTimeout(() => setXpGain(null), 1400);
    }
    setLevelInfo(prev => {
      if (update.leveledUp && update.level.level > prev.level) {
        toast.success(`Level up! Lv.${update.level.level}`);
      }
      return update.level;
    });
  }, []);

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

  // Poll for updates — uses refs to avoid stale closures and constant interval recreation
  const poll = useCallback(async () => {
    if (!playerId || actionLoadingRef.current) return;
    // Abort any in-flight poll before starting a new one (prevents race conditions)
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    try {
      const res = await fetch(
        `/api/games/${gameId}/poll?playerId=${playerId}&lastActionId=${lastActionIdRef.current}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      if (!data.changed || !data.game) return;

      const oldGame = gameRef.current;
      setGame(data.game);
      lastActionIdRef.current = data.lastActionId;

      // Detect events from state changes
      if (oldGame) {
        // Show toast for new log entries from opponents
        const newLogs = data.game.logs.slice(oldGame.logs.length);
        for (const log of newLogs) {
          if (log.playerId && log.playerId !== playerId) {
            toast(log.message, { duration: 2500 });
          }
        }

        for (const p of data.game.players) {
          const oldP = oldGame.players.find(op => op.id === p.id);
          if (oldP?.isAlive && !p.isAlive) {
            triggerExplosion();
            if (p.id === playerId) {
              applyProgressUpdate(recordExplosion());
            }
          }
        }
      }

      handlePendingAction(data.game, playerId);

      if (data.game.status === 'finished') {
        handleGameEnd(data.game);
      }
    } catch (err) {
      // Silently ignore aborted requests and network errors
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, [gameId, playerId]);

  function triggerExplosion() {
    setShowExplosion(true);
    sounds?.explosion();
    if (particleRef.current) {
      launchExplosionParticles(particleRef.current, window.innerWidth / 2, window.innerHeight / 2);
    }
    if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current);
    explosionTimerRef.current = setTimeout(() => setShowExplosion(false), 1800);
  }

  function handleGameEnd(g: GameState) {
    setShowWinner(true);
    if (hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    if (g.winnerId === playerId) {
      sounds?.win();
      applyProgressUpdate(recordWin());
      setTimeout(() => {
        if (confettiRef.current) launchConfetti(confettiRef.current);
      }, 300);
    } else {
      sounds?.lose();
      applyProgressUpdate(recordLoss());
    }
  }

  useEffect(() => {
    if (!showWinner) return;
    const stats = getStats();
    setRankTitle(getRankInfo(stats).title);
    setLevelInfo(getLevelInfo(stats));
  }, [showWinner]);

  useEffect(() => {
    return () => {
      if (xpGainTimerRef.current) clearTimeout(xpGainTimerRef.current);
      if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      pollAbortRef.current?.abort();
    };
  }, []);

  // Initialize
  useEffect(() => {
    const pid = localStorage.getItem(`ek_player_${gameId}`) || playerIdParam;
    if (!pid) {
      router.push('/');
      return;
    }
    localStorage.setItem(`ek_player_${gameId}`, pid);
    setPlayerId(pid);
    const stats = getStats();
    setRankTitle(getRankInfo(stats).title);
    setLevelInfo(getLevelInfo(stats));
    fetchGame(pid);
  }, [gameId, fetchGame, playerIdParam, router]);

  // Smart polling: fast when it's your turn or game active, slow when idle/background
  const isMyTurnRef = useRef(false);
  isMyTurnRef.current = isMyTurn;
  const gameStatusRef = useRef<string | undefined>(undefined);
  gameStatusRef.current = game?.status;

  useEffect(() => {
    const computeInterval = () => {
      if (document.hidden) return 5000; // Background tab: very slow
      if (gameStatusRef.current === 'finished') return 8000;
      if (gameStatusRef.current === 'waiting') return 3000;
      if (isMyTurnRef.current) return 1500; // My turn: faster
      return 2500; // Opponent's turn: moderate
    };
    const updatePolling = () => {
      setPollIntervalMs(computeInterval());
      if (!document.hidden) {
        void poll();
      }
    };
    updatePolling();
    document.addEventListener('visibilitychange', updatePolling);
    return () => document.removeEventListener('visibilitychange', updatePolling);
  }, [poll]);

  // Adjust polling speed when turn changes
  useEffect(() => {
    if (document.hidden) return;
    if (game?.status === 'finished') {
      setPollIntervalMs(8000);
    } else if (isMyTurn) {
      setPollIntervalMs(1500);
    } else {
      setPollIntervalMs(2500);
    }
  }, [isMyTurn, game?.status]);

  // Polling — stable interval, poll callback uses refs to read latest state
  useEffect(() => {
    if (!playerId) return;
    pollIntervalRef.current = setInterval(poll, pollIntervalMs);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [playerId, poll, pollIntervalMs]);

  // Play turn-start sound + vibrate on mobile
  useEffect(() => {
    if (isMyTurn && game?.status === 'playing') {
      sounds?.turnStart();
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, [isMyTurn, game?.currentPlayerIndex]);

  // Safety: reset actionLoading if stuck for over 15 seconds
  useEffect(() => {
    if (!actionLoading) return;
    const timeout = setTimeout(() => {
      setActionLoading(false);
      fetchGame();
    }, 15000);
    return () => clearTimeout(timeout);
  }, [actionLoading, fetchGame]);

  // Expose deterministic hooks for browser automation and text-state validation.
  useEffect(() => {
    const stateToText = () => JSON.stringify({
      coordinateSystem: 'N/A (card table)',
      gameId,
      status: game?.status ?? 'missing',
      code: game?.code ?? null,
      playersAlive: game?.players.filter(p => p.isAlive).length ?? 0,
      deckCount: game?.deck.length ?? 0,
      discardTop: game?.discardPile.at(-1)?.type ?? null,
      currentPlayerId: currentPlayer?.id ?? null,
      currentPlayerName: currentPlayer?.name ?? null,
      myPlayerId: playerId || null,
      myState: myPlayer
        ? {
            isAlive: myPlayer.isAlive,
            handCount: myPlayer.hand.length,
            handTypes: myPlayer.hand.map(card => card.type),
          }
        : null,
      turnsRemaining: game?.turnsRemaining ?? 0,
      pendingAction: game?.pendingAction?.type ?? null,
      selectedCards,
      progression: {
        level: levelInfo.level,
        levelProgressPct: Math.round(levelInfo.progress * 100),
        xpToNext: Math.max(0, levelInfo.nextLevelXp - levelInfo.xp),
        xpGain,
      },
      ui: {
        selectingTarget,
        selectingThreeTarget,
        showSeeFuture,
        showDefuseModal,
        showWinner,
      },
    });

    const win = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => Promise<void>;
    };

    win.render_game_to_text = stateToText;
    win.advanceTime = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));

    return () => {
      delete win.render_game_to_text;
      delete win.advanceTime;
    };
  }, [
    currentPlayer?.id,
    currentPlayer?.name,
    game,
    gameId,
    myPlayer,
    playerId,
    selectedCards,
    selectingTarget,
    selectingThreeTarget,
    showDefuseModal,
    showSeeFuture,
    showWinner,
    levelInfo,
    xpGain,
  ]);

  // Send action
  async function sendAction(actionData: Record<string, unknown>) {
    if (actionLoading) return;
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
        applyProgressUpdate(recordCardPlayed());
        // Flash screen border with card color
        const playedCard = myPlayer?.hand.find((c: Card) => c.id === actionData.cardId);
        if (playedCard) {
          const cardColor = CARD_INFO[playedCard.type].color;
          setFlashColor(cardColor);
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setFlashColor(null), 300);
        }
      } else if (actionData.type === 'draw') {
        sounds?.cardDraw();
      } else if (actionData.type === 'defuse_place') {
        applyProgressUpdate(recordDefuseUsed());
      } else if (actionData.type === 'steal_target') {
        applyProgressUpdate(recordCardsStolen(1));
      } else if (actionData.type === 'three_of_kind_target') {
        applyProgressUpdate(recordCardsStolen(1));
      }

      // Detect self-explosion
      const me = data.game.players.find((p: Player) => p.id === playerId);
      if (me && !me.isAlive) {
        triggerExplosion();
        applyProgressUpdate(recordExplosion());
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

  const handleCardClick = useCallback((card: Card) => {
    const g = gameRef.current;
    const pid = playerId;
    const myP = g?.players.find(p => p.id === pid);
    if (g?.pendingAction?.type === 'favor_give' && g?.pendingAction?.playerId === pid) {
      sendAction({ type: 'favor_give', cardId: card.id });
      return;
    }

    sounds?.click();

    if (isCatCard(card.type)) {
      setSelectedCards(prev => {
        if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
        const currentType = prev.length > 0 ? myP?.hand.find(c => c.id === prev[0])?.type : null;
        if (currentType && currentType !== card.type) return [card.id];
        if (prev.length >= 3) return prev;
        return [...prev, card.id];
      });
    } else {
      setSelectedCards(prev => prev.includes(card.id) ? [] : [card.id]);
    }
  }, [playerId]);

  const playSelected = useCallback(() => {
    const g = gameRef.current;
    const pid = playerId;
    const myP = g?.players.find(p => p.id === pid);
    const selCards = selectedCards;
    
    if (selCards.length === 0) return;
    const card = myP?.hand.find(c => c.id === selCards[0]);
    if (!card) return;

    if (selCards.length >= 2 && isCatCard(card.type)) {
      sendAction({ type: 'play_card', cardId: selCards[0], cardIds: selCards });
      return;
    }

    if (card.type === 'favor') {
      setSelectingTarget(true);
      return;
    }

    sendAction({ type: 'play_card', cardId: card.id });
  }, [playerId, selectedCards]);

  const drawCard = useCallback(() => {
    const g = gameRef.current;
    const currentP = g ? g.players[g.currentPlayerIndex] : null;
    if (currentP?.id !== playerId || !!g?.pendingAction || actionLoadingRef.current) return;
    sendAction({ type: 'draw' });
  }, [playerId]);

  function handleThreeOfKindSelect(targetId: string, cardType: CardType) {
    sendAction({ type: 'three_of_kind_target', targetPlayerId: targetId, targetCardType: cardType });
    setSelectingThreeTarget(false);
  }

  function handleTargetSelect(targetId: string) {
    const g = gameRef.current;
    const selCards = selectedCards;
    
    if (g?.pendingAction?.type === 'steal_target') {
      sendAction({ type: 'steal_target', targetPlayerId: targetId });
      setSelectingTarget(false);
      sounds?.steal();
      return;
    }
    const myP = g?.players.find(p => p.id === playerId);
    const selectedCard = myP?.hand.find(c => c.id === selCards[0]);
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

  const handleEmote = useCallback((emote: string) => {
    setFloatingEmote(emote);
  }, []);

  async function handleRematch() {
    if (!game) return;

    // For multiplayer games, just go home
    if (game.isMultiplayer) {
      router.push('/');
      return;
    }

    // For AI games, create a new game with same settings
    setRematchLoading(true);
    try {
      const savedName = localStorage.getItem('ek_playerName') || myPlayer?.name || 'Player';
      const savedAvatar = localStorage.getItem('ek_avatar');
      const avatarIdx = savedAvatar ? parseInt(savedAvatar) : (myPlayer?.avatar || 0);
      const aiPlayerCount = game.players.filter(p => p.isAI).length;

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: savedName,
          avatar: avatarIdx,
          mode: 'single',
          aiCount: aiPlayerCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`ek_player_${data.gameId}`, data.playerId);
      router.push(`/game/${data.gameId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rematch');
    } finally {
      setRematchLoading(false);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setShowHotkeys(prev => !prev);
        return;
      }

      if (event.key === 'Escape') {
        setSelectedCards([]);
        setSelectingTarget(false);
        setSelectingThreeTarget(false);
        setShowHotkeys(false);
        return;
      }

      if (!game || game.status !== 'playing' || showWinner) return;

      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        drawCard();
        return;
      }

      if ((event.key === 'Enter' || event.key.toLowerCase() === 'p') && canPlay) {
        event.preventDefault();
        playSelected();
        return;
      }

      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setShowLog(prev => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canPlay, drawCard, game, playSelected, showWinner]);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full" />
        <p className="text-text-muted text-sm">Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-4xl mb-2">😿</p>
        <p className="text-xl text-center">Game not found</p>
        <p className="text-text-muted text-sm text-center">This game may have expired or the link is incorrect.</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => fetchGame(playerId)} className="px-5 py-3 rounded-xl bg-surface-light border border-border text-text font-bold active:border-accent transition-colors min-h-[44px]">
            Retry
          </button>
          <button onClick={() => router.push('/')} className="px-5 py-3 rounded-xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold min-h-[44px]">
            Go Home
          </button>
        </div>
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
          className="glass-panel rounded-[1.75rem] max-w-lg w-full p-5 md:p-8 text-center"
        >
          <span className="status-pill mb-4">Lobby Open</span>
          <h2 className="display-font text-3xl text-warning mb-2">Invite Your Friends</h2>
          <p className="text-text-muted mb-5">Share this code and fill the table.</p>

          <motion.div
            className="bg-surface-light/80 border-2 border-accent rounded-2xl p-5 mb-5"
            animate={{ borderColor: ['#ff5f2e', '#ff844f', '#ff5f2e'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-4xl md:text-5xl font-mono font-black tracking-[0.38em] text-accent">{game.code}</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              onClick={() => {
                navigator.clipboard.writeText(game.code);
                toast.success('Code copied');
              }}
              className="cta-ghost py-2 text-sm"
            >
              Copy Code
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}?join=${game.code}`);
                toast.success('Invite link copied');
              }}
              className="cta-ghost py-2 text-sm"
            >
              Copy Invite Link
            </button>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-sm text-text-muted text-left">Players ({game.players.length}/5)</p>
            {game.players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 bg-surface-light/80 rounded-xl p-3 border border-border/80"
              >
                <span className="text-2xl">{AVATARS[p.avatar]}</span>
                <span className="font-bold">{p.name}</span>
                {p.id === game.hostId && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">Host</span>
                )}
              </motion.div>
            ))}
          </div>

          {game.hostId === playerId && game.players.length >= 2 && (
            <motion.button
              id="start-lobby-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startMultiplayerGame}
              className="cta-primary w-full py-3.5 text-lg"
            >
              Start Match ({game.players.length} players)
            </motion.button>
          )}

          {game.hostId !== playerId && (
            <p className="text-text-muted animate-pulse">Waiting for host to launch the game...</p>
          )}
        </motion.div>
      </div>
    );
  }

  // --- ACTIVE GAME ---

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative game-container-layer">
      {/* Particle canvases */}
      <canvas ref={confettiRef} className="fixed inset-0 w-full h-full pointer-events-none z-[60]" />
      <canvas ref={particleRef} className="fixed inset-0 w-full h-full pointer-events-none z-[55]" />
      <div className="pointer-events-none absolute -top-28 -left-16 w-64 h-64 rounded-full bg-accent/25 blur-[90px] hidden md:block" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-success/20 blur-[100px] hidden md:block" />

      {/* Card play flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-[45] rounded-lg"
            style={{ boxShadow: `inset 0 0 60px 10px ${flashColor}` }}
          />
        )}
      </AnimatePresence>

      {/* Explosion overlay */}
      <AnimatePresence>
        {showExplosion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div 
              className="absolute inset-0 bg-danger/40" 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.8, 0] }}
              transition={{ duration: 1.5, times: [0, 0.1, 0.3, 1] }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
            <motion.div 
              initial={{ scale: 0, rotate: -20 }} 
              animate={{ scale: [0, 3, 2.5, 0], rotate: [-20, 10, -5, 20] }} 
              transition={{ duration: 1.5, times: [0, 0.2, 0.4, 1], ease: "anticipate" }} 
              className="text-[140px] drop-shadow-[0_0_60px_rgba(255,51,85,0.8)] filter"
            >
              💥
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner modal */}
      <AnimatePresence>
        {showWinner && game.winnerId && (
          <motion.div initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} animate={{ opacity: 1, backdropFilter: 'blur(8px)' }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overscroll-contain">
            <motion.div 
              initial={{ scale: 0.8, y: 50, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-[linear-gradient(165deg,#1f183b_0%,#130f25_100%)] rounded-[2.5rem] p-8 md:p-10 text-center max-w-sm w-full border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] max-h-[90vh] overflow-y-auto scroll-touch"
            >
              {/* Cinematic background light */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-40 blur-[60px] pointer-events-none rounded-full ${game.winnerId === playerId ? 'bg-warning/20' : 'bg-danger/20'}`} />

              <motion.div animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="text-8xl mb-6 drop-shadow-[0_0_30px_rgba(255,184,51,0.4)]">
                {game.winnerId === playerId ? '🏆' : '💀'}
              </motion.div>
              
              <h2 className="display-font text-4xl mb-3 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent drop-shadow-md">
                {game.winnerId === playerId ? 'VICTORY' : 'DEFEAT'}
              </h2>
              <p className="text-text-muted mb-8 font-medium">
                {game.winnerId === playerId ? 'You survived the exploding kittens!' : `${game.players.find(p => p.id === game.winnerId)?.name} survived.`}
              </p>

              {game.winnerId === playerId && (
                <div className="mb-8 bg-black/30 border border-white/5 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full border border-warning/30 bg-warning/10 text-warning text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(255,184,51,0.2)]">
                      {rankTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 px-1">
                    <span>Lv.{levelInfo.level}</span>
                    <span>{Math.max(0, levelInfo.nextLevelXp - levelInfo.xp)} XP to next</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/60 overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-success/50 to-success rounded-full"
                      style={{ boxShadow: '0 0 10px rgba(43,212,124,0.6)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleRematch}
                  disabled={rematchLoading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-black text-lg tracking-wide shadow-[0_8px_24px_rgba(255,95,46,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-[#ff8d44]/50 disabled:opacity-50 min-h-[56px] relative overflow-hidden group"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -skew-x-12 -translate-x-full group-hover:translate-x-full duration-1000" />
                  {rematchLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    game.isMultiplayer ? 'PLAY AGAIN' : 'REMATCH'
                  )}
                </motion.button>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/')}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/90 font-bold hover:bg-white/10 transition-colors shadow-sm text-sm"
                  >
                    Home
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowStats(true)}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/90 font-bold hover:bg-white/10 transition-colors shadow-sm text-sm"
                  >
                    Stats
                  </motion.button>
                  <button onClick={() => setShowWinner(false)} className="px-5 py-3.5 rounded-xl bg-transparent text-text-muted hover:text-white transition-colors text-sm font-bold">
                    Board
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats modal */}
      <StatsDisplay show={showStats} onClose={() => setShowStats(false)} />

      {/* Keyboard shortcut helper */}
      <AnimatePresence>
        {showHotkeys && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
            onClick={() => setShowHotkeys(false)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass-panel rounded-3xl p-5 max-w-sm w-full border border-border"
            >
              <p className="display-font text-xl text-warning mb-3">Speed Controls</p>
              <div className="space-y-2 text-sm">
                <HotkeyItem keyLabel="D" description="Draw card" />
                <HotkeyItem keyLabel="Enter / P" description="Play selected cards" />
                <HotkeyItem keyLabel="L" description="Toggle game log" />
                <HotkeyItem keyLabel="?" description="Toggle this shortcut sheet" />
                <HotkeyItem keyLabel="Esc" description="Clear selections / close overlays" />
              </div>
              <button
                onClick={() => setShowHotkeys(false)}
                className="w-full mt-4 py-2.5 rounded-xl bg-surface-light border border-border hover:border-accent text-text font-bold"
              >
                Close
              </button>
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
      <div className="glass-panel border-x-0 border-t-0 rounded-none px-2 md:px-3 py-2 safe-top safe-x flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-start gap-1">
          <span className="status-pill py-1 text-[10px]">Room {game.code}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(game.code);
              toast.success('Code copied');
            }}
            className="text-[11px] text-text-muted active:text-accent min-h-[44px] flex items-center"
          >
            Copy code
          </button>
        </div>
        <div className="flex-1 overflow-x-auto scroll-touch">
          <OpponentBar
            players={game.players}
            currentPlayerId={currentPlayer?.id || ''}
            myId={playerId}
            onPlayerClick={selectableTargets ? handleTargetSelect : undefined}
            selectablePlayerIds={selectableTargets}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-success/35 bg-success/10 min-w-[88px]">
            <span className="text-[10px] font-black text-success uppercase">Lv {levelInfo.level}</span>
            <div className="h-1 w-12 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-success to-accent" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
            </div>
          </div>
          <button
            onClick={() => setShowHotkeys(prev => !prev)}
            className="w-10 h-10 rounded-lg bg-surface-light/85 border border-border flex items-center justify-center text-xs active:border-accent transition-colors"
            title="Keyboard shortcuts"
            aria-label="Toggle keyboard shortcuts"
          >
            HK
          </button>
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#20a4f3]/20 border-b border-[#20a4f3]/30 px-4 py-2 text-center text-[#86d7ff] font-bold text-sm animate-pulse">
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
      <div className="flex-1 flex flex-col items-center justify-start md:justify-center gap-2 md:gap-3 p-2 md:p-4 overflow-y-auto overflow-x-hidden relative game-bg table-aura scroll-touch">
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
            className={`text-center px-4 py-1.5 rounded-full text-sm font-bold border ${
              isMyTurn ? 'bg-accent/20 text-accent border-accent/40' : 'bg-surface-light/90 text-text-muted border-border'
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

        <motion.div
          key={actionHint}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full text-center text-xs md:text-sm text-text-muted bg-surface-light/70 border border-border/80 rounded-full px-4 py-2"
        >
          {actionHint}
        </motion.div>

        <AnimatePresence>
          {xpGain !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs font-black tracking-[0.08em] uppercase text-success bg-success/10 border border-success/40 rounded-full px-3 py-1"
            >
              +{xpGain} XP
            </motion.div>
          )}
        </AnimatePresence>

        {game.logs.length > 0 && (
          <motion.div
            key={game.logs[game.logs.length - 1].timestamp}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full text-center text-[11px] md:text-xs text-text bg-surface/65 border border-border/70 rounded-full px-3 py-1.5 truncate"
            title={game.logs[game.logs.length - 1].message}
          >
            Last action: {game.logs[game.logs.length - 1].message}
          </motion.div>
        )}

        {/* Draw & Discard piles */}
        <div className="flex items-center gap-6 md:gap-10 rounded-3xl bg-surface/60 border border-border/70 px-6 py-5 shadow-xl">
          <DrawPile count={game.deck.length} onClick={drawCard} disabled={actionLoading || hasPendingAction} isMyTurn={isMyTurn} />
          <DiscardPile cards={game.discardPile} />
        </div>

        <ComboCoach
          hand={myPlayer?.hand || []}
          isMyTurn={isMyTurn}
          hasPendingAction={hasPendingAction}
          selectingTarget={selectingTarget}
          selectingThreeTarget={selectingThreeTarget}
          deckSize={game.deck.length}
          alivePlayers={alivePlayers}
        />

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
      <div className="glass-panel border-x-0 border-b-0 rounded-none safe-x shadow-[0_-8px_32px_rgba(0,0,0,0.5)] z-20">
        {/* My info + actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-3xl drop-shadow-md">{AVATARS[myPlayer?.avatar || 0]}</span>
              {isMyTurn && myPlayer?.isAlive && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-[#130f25] shadow-[0_0_8px_var(--color-accent)]"
                />
              )}
            </div>
            <div>
              <p className={`font-black text-[15px] tracking-wide leading-none mb-1 text-white/95 ${myPlayer && !myPlayer.isAlive ? 'line-through text-danger/80' : ''}`}>
                {myPlayer?.name || 'You'}
              </p>
              <div className="flex items-center gap-1.5">
                {myPlayer?.isAlive ? (
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded text-white/70">
                    {myPlayer.hand.length} <span className="opacity-50">CARDS</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-danger font-bold uppercase tracking-widest bg-danger/10 px-1.5 py-0.5 rounded">
                    💀 DEAD
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selected card info */}
            {selectedCard && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 shadow-inner">
                <span className="text-base drop-shadow-sm">{CARD_INFO[selectedCard.type].emoji}</span>
                <span className="text-[10px] font-bold text-white/80 max-w-[80px] sm:max-w-[120px] truncate uppercase tracking-wider">{CARD_INFO[selectedCard.type].name}</span>
              </motion.div>
            )}

            {canPlay && (
              <motion.button
                id="play-selected-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.93 }}
                onClick={playSelected}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-black text-sm tracking-wide shadow-[0_4px_16px_rgba(255,95,46,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] whitespace-nowrap min-h-[44px] border border-[#ff8d44]/50"
              >
                {canPlayPair ? 'STEAL (PAIR)' : canPlayTriple ? 'STEAL (TRIPLE)' : 'PLAY'}
              </motion.button>
            )}
            {selectedCards.length > 0 && (
              <button onClick={() => setSelectedCards([])} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-muted text-sm flex items-center justify-center transition-colors">✕</button>
            )}
          </div>
        </div>
        <div className="px-4 py-1.5 hidden sm:block bg-black/20">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
            Hotkeys: <span className="text-white">D</span> draw, <span className="text-white">Enter/P</span> play, <span className="text-white">L</span> log, <span className="text-white">?</span> help
          </p>
        </div>

        {/* Hand */}
        <div className="pb-1 safe-bottom bg-[#0a0714]">
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

function HotkeyItem({ keyLabel, description }: { keyLabel: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-light/70 px-3 py-2">
      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-surface border border-border">{keyLabel}</span>
      <span className="text-text-muted">{description}</span>
    </div>
  );
}
