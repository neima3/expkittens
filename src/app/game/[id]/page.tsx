'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { GameState, Card, CardType, Player, SeriesState } from '@/types/game';
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
import ChatPanel from '@/components/game/ChatPanel';
import StatsDisplay from '@/components/game/StatsDisplay';
import PostMatchSummary from '@/components/game/PostMatchSummary';
import ComboCoach from '@/components/game/ComboCoach';
import AnimatedBackground from '@/components/game/AnimatedBackground';
import CardPreviewOverlay from '@/components/game/CardPreviewOverlay';
import { sounds } from '@/lib/sounds';
import { launchConfetti, launchExplosionParticles } from '@/lib/confetti';
import { recordWin, recordLoss, recordExplosion, recordCardPlayed, recordCardsStolen, recordDefuseUsed, recordCardTypePlayed, getStats, getRankInfo, getLevelInfo } from '@/lib/stats';
import type { ProgressUpdate } from '@/lib/stats';
import { AVATARS } from '@/types/game';

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

function SeriesScoreBar({ series, players, compact }: { series: SeriesState; players: Player[]; compact?: boolean }) {
  const winsNeeded = Math.ceil(series.bestOf / 2);

  // Check if any player is at match point
  const matchPointNames = Object.entries(series.scores)
    .filter(([, wins]) => wins === winsNeeded - 1)
    .map(([name]) => name);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-light/60 border border-border/50 text-xs">
        <span className="font-bold text-warning">Bo{series.bestOf}</span>
        <span className="text-text-muted">G{series.currentMatch}</span>
        <div className="flex gap-1.5">
          {Object.entries(series.scores).map(([name, wins]) => (
            <span key={name} className={`font-bold ${wins === winsNeeded - 1 ? 'text-danger' : 'text-text'}`}>
              {name.slice(0, 6)}:{wins}
            </span>
          ))}
        </div>
        {matchPointNames.length > 0 && (
          <span className="text-danger font-black animate-pulse">MP</span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex justify-center"
    >
      <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-surface-light/60 border border-border/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-warning">Best of {series.bestOf}</span>
          <span className="text-text-muted text-xs">|</span>
          <span className="text-xs text-text-muted font-medium">Match {series.currentMatch}</span>
        </div>
        <div className="h-4 w-px bg-border/50" />
        <div className="flex gap-3">
          {players.filter(p => !p.isAI || series.playerNames[p.id]).map(p => {
            const name = series.playerNames[p.id] || p.name;
            const wins = series.scores[name] || 0;
            const isMatchPoint = wins === winsNeeded - 1;
            return (
              <div key={p.id} className="flex items-center gap-1.5">
                <span className="text-lg">{AVATARS[p.avatar]}</span>
                <span className="text-sm font-bold text-text">{name}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: winsNeeded }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full border ${
                        i < wins
                          ? 'bg-success border-success shadow-[0_0_6px_rgba(43,212,124,0.5)]'
                          : 'bg-transparent border-border/60'
                      }`}
                    />
                  ))}
                </div>
                {isMatchPoint && (
                  <span className="text-[10px] font-black text-danger uppercase tracking-wider animate-pulse">
                    MP
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function RematchCountdown({ startTime, durationMs, players }: { startTime: number; durationMs: number; players: Player[] }) {
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTime;
      setRemaining(Math.max(0, durationMs - elapsed));
    };
    tick();
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [startTime, durationMs]);

  const seconds = Math.ceil(remaining / 1000);
  const progress = 1 - remaining / durationMs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-2"
    >
      <p className="text-accent font-black text-sm uppercase tracking-widest mb-2">
        Rematch starting in
      </p>
      <div className="flex items-center justify-center gap-3 mb-3">
        <motion.span
          key={seconds}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black text-white tabular-nums"
        >
          {seconds}
        </motion.span>
      </div>
      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-[#ff8855] rounded-full"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {players.map(p => (
          <span key={p.id} className="text-lg">{AVATARS[p.avatar]}</span>
        ))}
      </div>
    </motion.div>
  );
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
  const [defuseCountdown, setDefuseCountdown] = useState(10);
  const defuseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [selectingThreeTarget, setSelectingThreeTarget] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [explodedPlayer, setExplodedPlayer] = useState<{ name: string; avatar: number; isMe: boolean } | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [previewCardType, setPreviewCardType] = useState<CardType | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [rematchVotes, setRematchVotes] = useState<string[]>([]);
  const [rematchCountdown, setRematchCountdown] = useState<number | null>(null);
  const [rematchGameId, setRematchGameId] = useState<string | null>(null);
  const rematchRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(2500);
  const [rankTitle, setRankTitle] = useState('Rookie Spark');
  const [levelInfo, setLevelInfo] = useState(() => getLevelInfo(getStats()));
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [matchStats, setMatchStats] = useState({ cardsDrawn: 0, defusesUsed: 0, opponentsEliminated: 0 });
  const [showPostMatchSummary, setShowPostMatchSummary] = useState(false);
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
    setProgressUpdate(update);
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

  // Defuse countdown timer — 10s, auto-submits random on expiry
  const [defuseTimedOut, setDefuseTimedOut] = useState(false);
  useEffect(() => {
    if (!showDefuseModal) {
      if (defuseTimerRef.current) { clearInterval(defuseTimerRef.current); defuseTimerRef.current = null; }
      setDefuseTimedOut(false);
      return;
    }
    setDefuseCountdown(10);
    setDefuseTimedOut(false);
    const start = Date.now();
    defuseTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, 10 - elapsed);
      setDefuseCountdown(remaining);
      if (remaining <= 0) {
        if (defuseTimerRef.current) clearInterval(defuseTimerRef.current);
        setDefuseTimedOut(true);
      }
    }, 100);
    return () => { if (defuseTimerRef.current) clearInterval(defuseTimerRef.current); };
  }, [showDefuseModal]);

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

  const poll = useCallback(async () => {
    if (!playerId || actionLoadingRef.current) return;
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

      if (oldGame) {
        const newLogs = data.game.logs.slice(oldGame.logs.length);
        for (const log of newLogs) {
          if (log.playerId && log.playerId !== playerId) {
            toast(log.message, { duration: 2500 });
          }
        }

        for (const p of data.game.players) {
          const oldP = oldGame.players.find(op => op.id === p.id);
          if (oldP?.isAlive && !p.isAlive) {
            triggerExplosion({ name: p.name, avatar: p.avatar, isMe: p.id === playerId });
            if (p.id === playerId) {
              applyProgressUpdate(recordExplosion());
            }
          }
        }
      }

      handlePendingAction(data.game, playerId);

      if (data.game.status === 'finished') {
        handleGameEnd(data.game);
        // Sync rematch state from polled game
        if (data.game.rematchRequests) {
          setRematchVotes(data.game.rematchRequests);
        }
        if (data.game.rematchGameId && !rematchGameId) {
          setRematchGameId(data.game.rematchGameId);
          setRematchCountdown(data.game.rematchCountdown || Date.now());
          // Look up our new player ID from the rematch API
          fetch(`/api/games/${gameId}/rematch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
          })
            .then(r => r.json())
            .then(d => {
              if (d.playerIdMap?.[playerId]) {
                localStorage.setItem(`ek_player_${data.game.rematchGameId}`, d.playerIdMap[playerId]);
              }
              rematchRedirectTimerRef.current = setTimeout(() => {
                router.push(`/game/${data.game.rematchGameId}`);
              }, 5000);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, [gameId, playerId, rematchGameId, router]);

  function triggerExplosion(diedPlayer?: { name: string; avatar: number; isMe: boolean }) {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setExplodedPlayer(diedPlayer || null);
    setShowExplosion(true);
    sounds?.explosion();
    if (!prefersReduced && particleRef.current) {
      launchExplosionParticles(particleRef.current, window.innerWidth / 2, window.innerHeight / 2);
    }
    // Screen shake via CSS
    if (!prefersReduced) {
      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 500);
    }
    if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current);
    explosionTimerRef.current = setTimeout(() => {
      setShowExplosion(false);
      setExplodedPlayer(null);
    }, 2800);
  }

  function handleGameEnd(g: GameState) {
    // Calculate match stats from game logs
    let cardsDrawn = 0;
    let defusesUsed = 0;
    let opponentsEliminated = 0;
    
    g.logs.forEach(log => {
      if (log.playerId === playerId) {
        if (log.message.includes('drew')) cardsDrawn++;
        if (log.message.includes('defused')) defusesUsed++;
      }
      if (log.message.includes('exploded') && log.playerId !== playerId) {
        opponentsEliminated++;
      }
    });
    
    setMatchStats({ cardsDrawn, defusesUsed, opponentsEliminated });
    setShowPostMatchSummary(true);
    
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
      if (rematchRedirectTimerRef.current) clearTimeout(rematchRedirectTimerRef.current);
      pollAbortRef.current?.abort();
    };
  }, []);

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

  const isMyTurnRef = useRef(false);
  isMyTurnRef.current = isMyTurn;
  const gameStatusRef = useRef<string | undefined>(undefined);
  gameStatusRef.current = game?.status;

  const rematchVotesRef = useRef<string[]>([]);
  rematchVotesRef.current = rematchVotes;

  useEffect(() => {
    const computeInterval = () => {
      if (document.hidden) return 5000;
      if (gameStatusRef.current === 'finished' && rematchVotesRef.current.length > 0) return 2000;
      if (gameStatusRef.current === 'finished') return 8000;
      if (gameStatusRef.current === 'waiting') return 3000;
      if (isMyTurnRef.current) return 1500;
      return 2500;
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

  useEffect(() => {
    if (document.hidden) return;
    if (game?.status === 'finished' && rematchVotes.length > 0) {
      setPollIntervalMs(2000);
    } else if (game?.status === 'finished') {
      setPollIntervalMs(8000);
    } else if (isMyTurn) {
      setPollIntervalMs(1500);
    } else {
      setPollIntervalMs(2500);
    }
  }, [isMyTurn, game?.status, rematchVotes.length]);

  useEffect(() => {
    if (!playerId) return;
    pollIntervalRef.current = setInterval(poll, pollIntervalMs);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [playerId, poll, pollIntervalMs]);

  useEffect(() => {
    if (isMyTurn && game?.status === 'playing') {
      sounds?.turnStart();
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, [isMyTurn, game?.currentPlayerIndex]);

  useEffect(() => {
    if (!actionLoading) return;
    const timeout = setTimeout(() => {
      setActionLoading(false);
      fetchGame();
    }, 15000);
    return () => clearTimeout(timeout);
  }, [actionLoading, fetchGame]);

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

      if (actionData.type === 'play_card') {
        sounds?.cardPlay();
        applyProgressUpdate(recordCardPlayed());
        const playedCard = myPlayer?.hand.find((c: Card) => c.id === actionData.cardId);
        if (playedCard) {
          recordCardTypePlayed(playedCard.type);
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

      const me = data.game.players.find((p: Player) => p.id === playerId);
      if (me && !me.isAlive) {
        triggerExplosion({ name: me.name, avatar: me.avatar, isMe: true });
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

  // Handle defuse timeout auto-submit
  useEffect(() => {
    if (!defuseTimedOut || !showDefuseModal) return;
    const g = gameRef.current;
    const randomPos = g ? Math.floor(Math.random() * (g.deck.length + 1)) : 0;
    setShowDefuseModal(false);
    setDefusePosition(0);
    sendAction({ type: 'defuse_place', position: randomPos });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defuseTimedOut]);

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

    if (game.isMultiplayer) {
      // Multiplayer rematch: vote via API
      setRematchLoading(true);
      try {
        const res = await fetch(`/api/games/${gameId}/rematch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.status === 'ready' && data.rematchGameId) {
          // Store new player ID mapping and redirect after countdown
          if (data.playerIdMap?.[playerId]) {
            localStorage.setItem(`ek_player_${data.rematchGameId}`, data.playerIdMap[playerId]);
          }
          setRematchGameId(data.rematchGameId);
          setRematchCountdown(Date.now());
          const delay = data.countdownMs || 5000;
          rematchRedirectTimerRef.current = setTimeout(() => {
            router.push(`/game/${data.rematchGameId}`);
          }, delay);
        } else {
          // Update vote state
          setRematchVotes(data.rematchRequests || []);
          toast.success('Rematch vote cast! Waiting for others...');
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to request rematch');
      } finally {
        setRematchLoading(false);
      }
      return;
    }

    // Single-player rematch
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
          bestOf: game.series?.bestOf,
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

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#090714]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full" />
        <p className="text-text-muted text-sm">Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4 bg-[#090714]">
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

  if (game.status === 'waiting') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-[#090714]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-[1.75rem] max-w-lg w-full p-5 md:p-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="status-pill">Lobby Open</span>
            {game.series && (
              <span className="status-pill bg-warning/20 border-warning/40 text-warning">
                Best of {game.series.bestOf}
              </span>
            )}
          </div>
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

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative game-container-layer bg-bg">
      {/* Animated background */}
      <AnimatedBackground />
      <canvas ref={confettiRef} className="fixed inset-0 w-full h-full pointer-events-none z-[60]" />
      <canvas ref={particleRef} className="fixed inset-0 w-full h-full pointer-events-none z-[55]" />

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

      <AnimatePresence>
        {showExplosion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
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
                {/* Avatar with explosion ring */}
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

            {/* Scattered debris particles (CSS-only) */}
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

      <PostMatchSummary
        show={showPostMatchSummary}
        onClose={() => setShowPostMatchSummary(false)}
        onPlayAgain={handleRematch}
        onGoHome={() => router.push('/')}
        isWinner={game?.winnerId === playerId}
        matchStats={matchStats}
        progressUpdate={progressUpdate}
        series={game?.series}
        playerId={playerId}
        players={game?.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) || []}
      />

      <StatsDisplay show={showStats} onClose={() => setShowStats(false)} />

      <CardPreviewOverlay cardType={previewCardType} />

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

      <AnimatePresence>
        {showDefuseModal && game && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-surface rounded-3xl p-6 text-center max-w-sm w-full border-2 border-success relative overflow-hidden">
              {/* Countdown ring */}
              <div className="absolute top-3 right-3 w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    stroke={defuseCountdown <= 3 ? '#ff3355' : '#2bd47c'}
                    strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${(defuseCountdown / 10) * 97.4} 97.4`}
                    className="transition-all duration-100"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${defuseCountdown <= 3 ? 'text-danger' : 'text-text'}`}>
                  {Math.ceil(defuseCountdown)}
                </span>
              </div>

              <p className="text-4xl mb-2">🔧💣</p>
              <h3 className="text-xl font-bold mb-1">Defused!</h3>
              <p className="text-sm text-text-muted mb-4">Place the Exploding Kitten back in the deck.</p>

              {/* Quick-pick buttons */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setDefusePosition(0)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${defusePosition === 0 ? 'bg-danger text-white ring-2 ring-danger/50' : 'bg-surface-light text-text-muted hover:bg-danger/20 hover:text-danger'}`}>
                  Top
                  <span className="block text-[10px] font-normal opacity-70">Evil!</span>
                </button>
                <button onClick={() => { const randomPos = Math.floor(Math.random() * (game.deck.length + 1)); setDefusePosition(randomPos); }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all bg-surface-light text-text-muted hover:bg-warning/20 hover:text-warning`}>
                  Random
                  <span className="block text-[10px] font-normal opacity-70">Chaos</span>
                </button>
                <button onClick={() => setDefusePosition(game.deck.length)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${defusePosition === game.deck.length ? 'bg-success text-white ring-2 ring-success/50' : 'bg-surface-light text-text-muted hover:bg-success/20 hover:text-success'}`}>
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
                        <button key={i} onClick={() => setDefusePosition(pos)}
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

              {/* Slider for precise control */}
              <input type="range" min={0} max={game.deck.length} value={defusePosition}
                onChange={e => setDefusePosition(Number(e.target.value))}
                className="w-full mb-2 accent-success" />
              <p className="text-sm text-text-muted mb-4">
                Position: <span className="font-bold text-success">{defusePosition}</span> of {game.deck.length}
                {defusePosition === 0 ? <span className="text-danger ml-1">(Next player draws it!)</span>
                  : defusePosition <= 2 ? <span className="text-danger ml-1">(Evil!)</span>
                  : defusePosition >= game.deck.length ? <span className="text-success ml-1">(Buried deep)</span>
                  : defusePosition >= game.deck.length - 2 ? <span className="text-success ml-1">(Safe for now)</span>
                  : ''}
              </p>

              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (defuseTimerRef.current) clearInterval(defuseTimerRef.current);
                  setShowDefuseModal(false);
                  sendAction({ type: 'defuse_place', position: defusePosition });
                  setDefusePosition(0);
                }}
                className="w-full py-3 rounded-xl bg-success text-white font-bold text-base">
                Place It!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ThreeOfKindModal
        show={selectingThreeTarget}
        targets={game.players.filter(p => p.isAlive && p.id !== playerId && p.hand.length > 0)}
        onSelect={handleThreeOfKindSelect}
        onCancel={() => setSelectingThreeTarget(false)}
      />

      {/* NOPE WINDOW */}
      <AnimatePresence>
        {game.pendingAction?.type === 'nope_window' && game.pendingAction.expiresAt && (() => {
          const pa = game.pendingAction!;
          const nopeChain = pa.nopeChain || [];
          const cardPlayed = pa.cardPlayed || 'nope';
          const sourcePlayer = game.players.find(p => p.id === pa.sourcePlayerId);
          const myNopeCards = myPlayer?.hand.filter(c => c.type === 'nope') || [];
          const canNope = myNopeCards.length > 0 && pa.sourcePlayerId !== playerId;
          const timeLeft = Math.max(0, (pa.expiresAt! - Date.now()) / 1000);

          return (
            <motion.div
              key="nope-window"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
            >
              <div className="bg-surface/95 backdrop-blur-xl border-2 border-[#888] rounded-2xl p-4 shadow-[0_0_30px_rgba(136,136,136,0.3)]">
                {/* Timer bar */}
                <div className="w-full h-1.5 rounded-full bg-border/50 mb-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: timeLeft <= 2 ? '#ff3355' : '#888888' }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 5) * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
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
                      onClick={() => {
                        const nopeCard = myNopeCards[0];
                        sendAction({ type: 'play_card', cardId: nopeCard.id });
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-[#888] text-white font-bold text-sm animate-pulse"
                    >
                      NOPE! ({myNopeCards.length})
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => sendAction({ type: 'nope_pass' })}
                      className="flex-1 py-2.5 rounded-xl bg-surface-light text-text-muted font-bold text-sm"
                    >
                      Pass
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted text-center">
                    {pa.sourcePlayerId === playerId ? 'Waiting for other players...' : 'You have no Nope cards'}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MOBILE TOP BAR */}
      <div className="lg:hidden glass-panel border-x-0 border-t-0 rounded-none px-2 md:px-3 py-2 safe-top safe-x flex items-center gap-2 z-30">
        <div className="hidden sm:flex flex-col items-start gap-1">
          <span className="status-pill py-1 text-[10px]">Room {game.code}</span>
          {game.series ? (
            <SeriesScoreBar series={game.series} players={game.players} compact />
          ) : (
            <button
              onClick={() => {
                navigator.clipboard.writeText(game.code);
                toast.success('Code copied');
              }}
              className="text-[11px] text-text-muted active:text-accent min-h-[44px] flex items-center"
            >
              Copy code
            </button>
          )}
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
          <button
            onClick={() => setShowHotkeys(prev => !prev)}
            className="w-10 h-10 rounded-lg bg-surface-light/85 border border-border flex items-center justify-center text-xs active:border-accent transition-colors"
          >
            HK
          </button>
          <SoundToggle />
          <QuickEmotes onEmote={handleEmote} />
          {game.isMultiplayer && <ChatPanel gameId={gameId} playerId={playerId} disabled={!myPlayer?.isAlive} />}
        </div>
      </div>

      <AnimatePresence>
        {selectingTarget && !selectingThreeTarget && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-warning/20 border-b border-warning/30 px-4 py-2 text-center text-warning font-bold text-sm z-20">
            Select a player to steal a random card!
            <button onClick={() => setSelectingTarget(false)} className="ml-3 text-text-muted hover:text-text text-xs underline">Cancel</button>
          </motion.div>
        )}
        {favorGiveMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#20a4f3]/20 border-b border-[#20a4f3]/30 px-4 py-2 text-center text-[#86d7ff] font-bold text-sm animate-pulse z-20">
            Someone asked for a Favor! Tap a card to give it.
          </motion.div>
        )}
      </AnimatePresence>

      {myPlayer && !myPlayer.isAlive && game.status === 'playing' && (
        <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="text-center">
            <p className="text-6xl mb-4">💀</p>
            <p className="text-2xl font-bold text-danger mb-2">You Exploded!</p>
            <p className="text-text-muted mb-4">Watching the game...</p>
            <button onClick={() => router.push('/')} className="px-6 py-2 rounded-xl bg-surface-light border border-border text-text hover:border-accent transition-colors">Leave Game</button>
          </div>
        </div>
      )}

      {/* MAIN GAME LAYOUT */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[16rem_1fr_14rem] lg:grid-rows-[1fr] overflow-hidden relative game-bg table-aura w-full max-w-[1800px] mx-auto z-10">
        
        {/* LEFT SIDEBAR (Desktop) */}
        <div className="hidden lg:flex flex-col gap-4 p-5 border-r border-white/5 bg-black/20 overflow-y-auto">
          <div className="glass-panel p-4 rounded-2xl text-center">
            <span className="status-pill text-xs mb-3 block">Room {game.code}</span>
            <button onClick={() => { navigator.clipboard.writeText(game.code); toast.success('Code copied'); }} className="text-sm font-bold text-text-muted hover:text-accent transition-colors w-full bg-surface-light/50 py-2 rounded-xl border border-border">
              Copy Code
            </button>
          </div>
          <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 text-sm font-black text-text-muted uppercase tracking-wider bg-surface-light/40">
              Game Log
            </div>
            <div className="flex-1 overflow-y-auto p-3 scroll-touch text-sm">
              <GameLog logs={game.logs} />
            </div>
          </div>
        </div>

        {/* CENTER AREA */}
        <div className="flex-1 flex flex-col items-center justify-start lg:justify-between p-2 md:p-4 lg:p-6 overflow-y-auto overflow-x-hidden relative scroll-touch">
          
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

          {/* Series Score Bar (Desktop) */}
          {game.series && (
            <div className="hidden lg:flex w-full justify-center pt-2 pb-1">
              <SeriesScoreBar series={game.series} players={game.players} />
            </div>
          )}

          {/* Opponents Row (Desktop) */}
          <div className="hidden lg:flex w-full justify-center pb-8 pt-2">
            <div className="max-w-3xl w-full">
              <OpponentBar
                players={game.players}
                currentPlayerId={currentPlayer?.id || ''}
                myId={playerId}
                onPlayerClick={selectableTargets ? handleTargetSelect : undefined}
                selectablePlayerIds={selectableTargets}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:hidden">
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
            <DangerMeter deckSize={game.deck.length} alivePlayers={alivePlayers} defuseCount={myPlayer?.hand.filter(c => c.type === 'defuse').length ?? 0} />
          </div>

          {/* Desktop Turn Indicator */}
          <div className="hidden lg:flex w-full justify-center mb-6">
            <motion.div
              key={`desk-${game.currentPlayerIndex}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center px-6 py-2 rounded-full text-lg font-black tracking-wide border shadow-lg ${
                isMyTurn ? 'bg-accent/20 text-accent border-accent/50 shadow-accent/20' : 'bg-surface-light/90 text-text-muted border-border shadow-black/20'
              }`}
            >
              {isMyTurn ? (
                <>IT&apos;S YOUR TURN! {game.turnsRemaining > 1 && <span className="text-warning ml-2">({game.turnsRemaining} turns left)</span>}</>
              ) : (
                <span className="flex items-center gap-2">
                  {currentPlayer?.name} is playing...
                  {currentPlayer?.isAI && actionLoading && <span className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />}
                  {game.turnsRemaining > 1 && <span className="text-warning ml-2">({game.turnsRemaining} turns)</span>}
                </span>
              )}
            </motion.div>
          </div>

          <motion.div
            key={actionHint}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full text-center text-xs md:text-sm lg:text-base lg:font-bold text-text-muted bg-surface-light/70 lg:bg-black/40 border border-border/80 lg:border-white/10 rounded-full px-4 py-2 lg:px-6 lg:py-3 mb-4 lg:mb-8 shadow-inner"
          >
            {actionHint}
          </motion.div>

          <AnimatePresence>
            {xpGain !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs lg:text-sm font-black tracking-[0.08em] uppercase text-success bg-success/10 border border-success/40 rounded-full px-3 py-1 lg:px-4 lg:py-2 mb-4 lg:absolute lg:top-1/4 lg:right-1/4"
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
              className="max-w-xl w-full text-center text-[11px] md:text-xs text-text bg-surface/65 border border-border/70 rounded-full px-3 py-1.5 truncate lg:hidden mb-4"
              title={game.logs[game.logs.length - 1].message}
            >
              Last action: {game.logs[game.logs.length - 1].message}
            </motion.div>
          )}

          {/* Draw & Discard piles */}
          <div className="flex items-center gap-6 md:gap-10 lg:gap-20 rounded-3xl lg:rounded-[3rem] bg-surface/60 lg:bg-black/30 border border-border/70 lg:border-white/10 px-6 py-5 lg:px-12 lg:py-10 shadow-xl lg:shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] lg:mb-12 transition-transform">
            <div className="lg:scale-[1.3] lg:origin-center">
              <DrawPile count={game.deck.length} onClick={drawCard} disabled={actionLoading || hasPendingAction} isMyTurn={isMyTurn} />
            </div>
            <div className="lg:scale-[1.3] lg:origin-center">
              <DiscardPile cards={game.discardPile} onPreview={setPreviewCardType} onPreviewEnd={() => setPreviewCardType(null)} />
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto">
            <ComboCoach
              hand={myPlayer?.hand || []}
              isMyTurn={isMyTurn}
              hasPendingAction={hasPendingAction}
              selectingTarget={selectingTarget}
              selectingThreeTarget={selectingThreeTarget}
              deckSize={game.deck.length}
              alivePlayers={alivePlayers}
            />
          </div>

          <button onClick={() => setShowLog(!showLog)} className="lg:hidden text-xs text-text-muted hover:text-accent transition-colors mt-2">
            {showLog ? 'Hide Log ▲' : `Game Log (${game.logs.length}) ▼`}
          </button>
          <AnimatePresence>
            {showLog && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full max-w-lg overflow-hidden lg:hidden mt-2">
                <GameLog logs={game.logs} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDEBAR (Desktop) */}
        <div className="hidden lg:flex flex-col gap-4 p-5 border-l border-white/5 bg-black/20 overflow-y-auto">
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-5">
            <DangerMeter deckSize={game.deck.length} alivePlayers={alivePlayers} defuseCount={myPlayer?.hand.filter(c => c.type === 'defuse').length ?? 0} />
          </div>
          
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success to-accent"></div>
            <div className="flex items-center justify-between text-sm font-black text-text uppercase tracking-widest">
              <span>Level {levelInfo.level}</span>
            </div>
            <div className="h-3 rounded-full bg-surface overflow-hidden shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-success to-accent" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
            </div>
            <div className="text-xs text-text-muted text-right font-bold mt-1">
              {Math.max(0, levelInfo.nextLevelXp - levelInfo.xp)} XP to next
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
            <button onClick={() => setShowHotkeys(true)} className="w-full py-3 bg-surface-light border border-border rounded-xl text-sm font-bold hover:border-accent hover:text-accent transition-colors">
              Keyboard Shortcuts
            </button>
            <div className="flex gap-2">
              <div className="flex-1 flex justify-center py-2 bg-surface-light border border-border rounded-xl">
                <SoundToggle />
              </div>
              <div className="flex-1 flex justify-center py-2 bg-surface-light border border-border rounded-xl">
                <QuickEmotes onEmote={handleEmote} />
              </div>
            </div>
            {game.isMultiplayer && (
              <div className="flex justify-center py-2 bg-surface-light border border-border rounded-xl">
                <ChatPanel gameId={gameId} playerId={playerId} disabled={!myPlayer?.isAlive} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="glass-panel border-x-0 border-b-0 rounded-none safe-x shadow-[0_-16px_48px_rgba(0,0,0,0.6)] z-20 bg-[#090714] lg:bg-gradient-to-t lg:from-black lg:to-black/80 lg:border-t-white/10">
        <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4 border-b border-white/5 lg:border-none">
          <div className="flex items-center gap-3 lg:gap-5">
            <div className="relative">
              <span className="text-3xl lg:text-5xl drop-shadow-lg">{AVATARS[myPlayer?.avatar || 0]}</span>
              {isMyTurn && myPlayer?.isAlive && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-accent border-2 border-[#130f25] shadow-[0_0_12px_var(--color-accent)]"
                />
              )}
            </div>
            <div>
              <p className={`font-black text-[15px] lg:text-xl tracking-wide leading-none mb-1 lg:mb-2 text-white/95 ${myPlayer && !myPlayer.isAlive ? 'line-through text-danger/80' : ''}`}>
                {myPlayer?.name || 'You'}
              </p>
              <div className="flex items-center gap-1.5">
                {myPlayer?.isAlive ? (
                  <span className="text-[10px] lg:text-xs text-text-muted font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md text-white/70 shadow-inner">
                    {myPlayer.hand.length} <span className="opacity-50">CARDS</span>
                  </span>
                ) : (
                  <span className="text-[10px] lg:text-xs text-danger font-bold uppercase tracking-widest bg-danger/10 px-1.5 py-0.5 lg:px-3 lg:py-1 rounded-md">
                    💀 DEAD
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {selectedCard && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2.5 rounded-xl lg:rounded-2xl bg-black/40 lg:bg-black/60 border border-white/10 shadow-inner">
                <span className="text-base lg:text-2xl drop-shadow-sm">{CARD_INFO[selectedCard.type].emoji}</span>
                <span className="text-[10px] lg:text-xs font-bold text-white/80 max-w-[80px] sm:max-w-[120px] lg:max-w-[200px] truncate uppercase tracking-wider">{CARD_INFO[selectedCard.type].name}</span>
              </motion.div>
            )}

            {canPlay && (
              <motion.button
                id="play-selected-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.93 }}
                onClick={playSelected}
                className="px-6 py-2.5 lg:px-10 lg:py-4 rounded-xl lg:rounded-2xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-black text-sm lg:text-lg tracking-wider shadow-[0_4px_16px_rgba(255,95,46,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] lg:shadow-[0_8px_32px_rgba(255,95,46,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)] whitespace-nowrap min-h-[44px] lg:min-h-[56px] border border-[#ff8d44]/50 transition-transform hover:scale-105"
              >
                {canPlayPair ? 'STEAL (PAIR)' : canPlayTriple ? 'STEAL (TRIPLE)' : 'PLAY'}
              </motion.button>
            )}
            {selectedCards.length > 0 && (
              <button onClick={() => setSelectedCards([])} className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-muted text-sm lg:text-lg flex items-center justify-center transition-colors">✕</button>
            )}
          </div>
        </div>

        <div className="pb-1 safe-bottom bg-[#0a0714] lg:bg-transparent lg:pb-8 lg:pt-6 overflow-visible">
          <PlayerHand
            cards={myPlayer?.hand || []}
            selectedCards={selectedCards}
            onCardClick={handleCardClick}
            disabled={(!isMyTurn && !favorGiveMode && !isPendingOnMe) || actionLoading}
            onPreview={setPreviewCardType}
            onPreviewEnd={() => setPreviewCardType(null)}
          />
        </div>
      </div>
    </div>
  );
}

function HotkeyItem({ keyLabel, description }: { keyLabel: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg lg:rounded-xl border border-border bg-surface-light/70 lg:bg-black/30 px-3 py-2 lg:px-4 lg:py-3 shadow-inner">
      <span className="text-xs lg:text-sm font-black px-2 py-0.5 lg:px-3 lg:py-1 rounded-md bg-surface border border-border">{keyLabel}</span>
      <span className="text-text-muted text-xs lg:text-sm font-medium">{description}</span>
    </div>
  );
}
