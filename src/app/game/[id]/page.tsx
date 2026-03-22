'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { GameState, Card, CardType, Player, SeriesState } from '@/types/game';
import { CARD_INFO, CAT_CARD_TYPES, AVATARS } from '@/types/game';
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
import SpectatorView from '@/components/game/SpectatorView';
import CardActionAnimation, { type CardAction, type CardActionType } from '@/components/game/CardActionAnimation';
import DrawCardAnimation from '@/components/game/DrawCardAnimation';
import ExplosionOverlay from '@/components/game/ExplosionOverlay';
import SeeFutureModal from '@/components/game/SeeFutureModal';
import DefusePlaceModal from '@/components/game/DefusePlaceModal';
import HotkeysModal from '@/components/game/HotkeysModal';
import NopeWindowBanner from '@/components/game/NopeWindowBanner';
import { sounds } from '@/lib/sounds';
import { launchConfetti } from '@/lib/confetti';
import {
  recordWin, recordLoss, recordExplosion, recordCardPlayed, recordCardsStolen,
  recordDefuseUsed, recordCardTypePlayed, recordDailyChallengeCompletion,
  getStats, getRankInfo, getLevelInfo,
} from '@/lib/stats';
import type { ProgressUpdate } from '@/lib/stats';
import { getTodayChallenge, isChallengeCompletedToday, checkChallengeCondition, completeTodayChallenge } from '@/lib/daily-challenges';
import { processNewGameState } from '@/lib/processGameState';
import { useGameConnection } from '@/hooks/useGameConnection';
import { useGameAnimations } from '@/hooks/useGameAnimations';

function isCatCard(type: CardType): boolean {
  return CAT_CARD_TYPES.includes(type);
}

function getActionHint(opts: {
  isMyTurn: boolean;
  hasPendingAction: boolean;
  selectingTarget: boolean;
  selectingThreeTarget: boolean;
  favorGiveMode: boolean;
  canPlay: boolean;
  selectedCards: string[];
  actionLoading: boolean;
  isNopeSelectedOutsideWindow: boolean;
}): string {
  if (opts.actionLoading) return 'Resolving action...';
  if (opts.favorGiveMode) return 'You owe a Favor. Pick one card from your hand to give.';
  if (opts.selectingThreeTarget) return 'Pick a target and name a card to complete your triple combo.';
  if (opts.selectingTarget) return 'Pick an opponent to steal from.';
  if (opts.hasPendingAction) return 'Finish the current prompt to continue.';
  if (!opts.isMyTurn) return 'Watch opponents and plan your next combo.';
  if (opts.selectedCards.length === 0) return 'Select cards to play, or draw to end your turn.';
  if (opts.isNopeSelectedOutsideWindow) return 'Nope can only be played during a Nope window — hold it for the right moment!';
  if (opts.canPlay) return 'You can play now or keep building a stronger combo.';
  return 'Selected cards are not a playable combo yet.';
}

function SeriesScoreBar({ series, players, compact }: { series: SeriesState; players: Player[]; compact?: boolean }) {
  const winsNeeded = Math.ceil(series.bestOf / 2);
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
        {matchPointNames.length > 0 && <span className="text-danger font-black animate-pulse">MP</span>}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex justify-center">
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
                    <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i < wins ? 'bg-success border-success shadow-[0_0_6px_rgba(43,212,124,0.5)]' : 'bg-transparent border-border/60'}`} />
                  ))}
                </div>
                {isMatchPoint && <span className="text-[10px] font-black text-danger uppercase tracking-wider animate-pulse">MP</span>}
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
    const tick = () => setRemaining(Math.max(0, durationMs - (Date.now() - startTime)));
    tick();
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [startTime, durationMs]);

  const seconds = Math.ceil(remaining / 1000);
  const progress = 1 - remaining / durationMs;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-2">
      <p className="text-accent font-black text-sm uppercase tracking-widest mb-2">Rematch starting in</p>
      <div className="flex items-center justify-center gap-3 mb-3">
        <motion.span key={seconds} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black text-white tabular-nums">
          {seconds}
        </motion.span>
      </div>
      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-accent to-[#ff8855] rounded-full" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {players.map(p => <span key={p.id} className="text-lg">{AVATARS[p.avatar]}</span>)}
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
  const spectateParam = searchParams.get('spectate');

  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [spectatorId, setSpectatorId] = useState<string>('');
  const [spectatorName, setSpectatorName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showSeeFuture, setShowSeeFuture] = useState(false);
  const [seeFutureCards, setSeeFutureCards] = useState<Card[]>([]);
  const [showDefuseModal, setShowDefuseModal] = useState(false);
  const [defusePosition, setDefusePosition] = useState(0);
  const [defuseCountdown, setDefuseCountdown] = useState(10);
  const defuseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [selectingThreeTarget, setSelectingThreeTarget] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [previewCardType, setPreviewCardType] = useState<CardType | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [rematchVotes, setRematchVotes] = useState<string[]>([]);
  const [rematchCountdown, setRematchCountdown] = useState<number | null>(null);
  const [rematchGameId, setRematchGameId] = useState<string | null>(null);
  const rematchRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rankTitle, setRankTitle] = useState('Rookie Spark');
  const [levelInfo, setLevelInfo] = useState(() => getLevelInfo(getStats()));
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [matchStats, setMatchStats] = useState({ cardsDrawn: 0, defusesUsed: 0, opponentsEliminated: 0 });
  const [showPostMatchSummary, setShowPostMatchSummary] = useState(false);
  const [defuseTimedOut, setDefuseTimedOut] = useState(false);

  const xpGainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRecordedResult = useRef(false);
  const gameRef = useRef<GameState | null>(null);
  const actionLoadingRef = useRef(false);
  const lastActionIdRef = useRef(0);
  const rematchGameIdRef = useRef<string | null>(null);
  const rematchVotesRef = useRef<string[]>([]);

  gameRef.current = game;
  actionLoadingRef.current = actionLoading;
  rematchGameIdRef.current = rematchGameId;
  rematchVotesRef.current = rematchVotes;

  const {
    confettiRef, particleRef,
    cardAction, setCardAction,
    drawAnimation, setDrawAnimation,
    showExplosion, explodedPlayer, triggerExplosion,
    pendingExplosion, setPendingExplosion,
    flashColor, triggerFlash,
    deckElementPos, setDeckElementPos,
  } = useGameAnimations();

  const myPlayer = useMemo(() => game?.players.find(p => p.id === playerId), [game?.players, playerId]);
  const currentPlayer = useMemo(() => game ? game.players[game.currentPlayerIndex] : null, [game?.players, game?.currentPlayerIndex]);
  const isMyTurn = currentPlayer?.id === playerId;
  const hasPendingAction = !!game?.pendingAction;
  const isPendingOnMe = game?.pendingAction?.playerId === playerId;
  const alivePlayers = useMemo(() => game?.players.filter(p => p.isAlive).length ?? 0, [game?.players]);
  const discardedEKs = useMemo(() => game?.discardPile.filter(c => c.type === 'exploding_kitten').length ?? 0, [game?.discardPile]);
  const selectedCard = useMemo(
    () => selectedCards.length > 0 ? myPlayer?.hand.find(c => c.id === selectedCards[0]) : null,
    [selectedCards, myPlayer?.hand]
  );
  const canPlayPair = selectedCards.length === 2 && !!selectedCard && isCatCard(selectedCard.type);
  const canPlayTriple = selectedCards.length === 3 && !!selectedCard && isCatCard(selectedCard.type);
  const canPlaySingle = selectedCards.length === 1 && !!selectedCard && !isCatCard(selectedCard.type) && selectedCard.type !== 'exploding_kitten' && selectedCard.type !== 'defuse' && selectedCard.type !== 'nope';
  const canPlay = isMyTurn && !hasPendingAction && (canPlaySingle || canPlayPair || canPlayTriple) && !actionLoading;
  const favorGiveMode = game?.pendingAction?.type === 'favor_give' && isPendingOnMe;
  const isNopeSelectedOutsideWindow = selectedCards.length === 1 && selectedCard?.type === 'nope' && game?.pendingAction?.type !== 'nope_window';
  const actionHint = useMemo(() => getActionHint({
    isMyTurn, hasPendingAction, selectingTarget, selectingThreeTarget,
    favorGiveMode, canPlay, selectedCards, actionLoading, isNopeSelectedOutsideWindow,
  }), [isMyTurn, hasPendingAction, selectingTarget, selectingThreeTarget, favorGiveMode, canPlay, selectedCards, actionLoading, isNopeSelectedOutsideWindow]);
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
      if (update.leveledUp && update.level.level > prev.level) toast.success(`Level up! Lv.${update.level.level}`);
      return update.level;
    });
  }, []);

  // Defuse countdown — 10s, auto-submits random position on expiry
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
      const remaining = Math.max(0, 10 - (Date.now() - start) / 1000);
      setDefuseCountdown(remaining);
      if (remaining <= 0) {
        if (defuseTimerRef.current) clearInterval(defuseTimerRef.current);
        setDefuseTimedOut(true);
      }
    }, 100);
    return () => { if (defuseTimerRef.current) clearInterval(defuseTimerRef.current); };
  }, [showDefuseModal]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [gameId, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePendingAction(g: GameState, pid: string, skipDefuseModal = false) {
    if (!g.pendingAction || g.pendingAction.playerId !== pid) return;
    switch (g.pendingAction.type) {
      case 'see_future':
        setSeeFutureCards(g.pendingAction.cards || []);
        setShowSeeFuture(true);
        sounds?.seeFuture();
        break;
      case 'defuse_place':
        if (!skipDefuseModal) { setShowDefuseModal(true); sounds?.defuse(); }
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
      case 'imploding_kitten_place':
        if (!skipDefuseModal) {
          setShowDefuseModal(true);
          toast.warning('☢️ Imploding Kitten! Choose where to place it face-up in the deck.', { duration: 4000 });
        }
        break;
    }
  }

  function handleGameEnd(g: GameState) {
    let cardsDrawn = 0, defusesUsed = 0, opponentsEliminated = 0, nopesPlayed = 0, kittensDrawn = 0, cardsPlayedCount = 0;
    g.logs.forEach(log => {
      if (log.playerId === playerId) {
        if (log.message.includes('drew')) cardsDrawn++;
        if (log.message.includes('defused')) defusesUsed++;
        if (log.message.includes('played Nope')) nopesPlayed++;
        if (log.message.includes('EXPLODED')) kittensDrawn++;
        if (log.message.includes('played ') && !log.message.includes('Nope')) cardsPlayedCount++;
      }
      if (log.message.includes('exploded') && log.playerId !== playerId) opponentsEliminated++;
    });
    setMatchStats({ cardsDrawn, defusesUsed, opponentsEliminated });
    setShowPostMatchSummary(true);
    if (hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    const savedName = typeof window !== 'undefined' ? (localStorage.getItem('ek_playerName') || 'Anonymous') : 'Anonymous';
    fetch('/api/stats', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: savedName, gameId, playerId, kittensDrawn, defusesUsed, nopesPlayed, cardsPlayed: cardsPlayedCount }),
    }).catch(() => {});
    const won = g.winnerId === playerId;
    if (won) {
      sounds?.win();
      if (!isChallengeCompletedToday()) {
        const todayChallenge = getTodayChallenge();
        if (checkChallengeCondition(todayChallenge, g, playerId)) {
          completeTodayChallenge(todayChallenge.id);
          applyProgressUpdate(recordDailyChallengeCompletion(todayChallenge.bonusXp));
          toast.success(`🎯 Daily Challenge complete! "${todayChallenge.title}" +${todayChallenge.bonusXp} XP +25 coins`, { duration: 5000 });
        }
      }
      applyProgressUpdate(recordWin());
      fetch('/api/leaderboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: savedName }),
      }).catch(() => {});
      setTimeout(() => { if (confettiRef.current) launchConfetti(confettiRef.current); }, 300);
    } else {
      sounds?.lose();
      applyProgressUpdate(recordLoss());
    }
  }

  function handleRematchReady(newRematchGameId: string, countdown: number) {
    setRematchGameId(newRematchGameId);
    setRematchCountdown(countdown);
    fetch(`/api/games/${gameId}/rematch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.playerIdMap?.[playerId]) localStorage.setItem(`ek_player_${newRematchGameId}`, d.playerIdMap[playerId]);
        rematchRedirectTimerRef.current = setTimeout(() => router.push(`/game/${newRematchGameId}`), 5000);
      })
      .catch(() => {});
  }

  const handleGameUpdate = useCallback((newGame: GameState, lastActionId: number) => {
    const oldGame = gameRef.current;
    setGame(newGame);
    lastActionIdRef.current = lastActionId;
    if (oldGame) {
      processNewGameState(
        oldGame, newGame, playerId,
        (action) => setCardAction(action),
        (diedPlayer) => {
          triggerExplosion(diedPlayer);
          if (diedPlayer.isMe) applyProgressUpdate(recordExplosion());
        },
      );
    }
    handlePendingAction(newGame, playerId);
    if (newGame.status === 'finished') {
      handleGameEnd(newGame);
      if (newGame.rematchRequests) setRematchVotes(newGame.rematchRequests);
      const newRematchGameId = newGame.rematchGameId;
      if (newRematchGameId && !rematchGameIdRef.current) {
        handleRematchReady(newRematchGameId, newGame.rematchCountdown || Date.now());
      }
    }
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { poll } = useGameConnection({
    gameId, playerId, spectatorId,
    lastActionIdRef, actionLoadingRef,
    onUpdate: handleGameUpdate,
  });

  useEffect(() => {
    if (!showWinner) return;
    const stats = getStats();
    setRankTitle(getRankInfo(stats).title);
    setLevelInfo(getLevelInfo(stats));
  }, [showWinner]);

  useEffect(() => {
    return () => {
      if (xpGainTimerRef.current) clearTimeout(xpGainTimerRef.current);
      if (rematchRedirectTimerRef.current) clearTimeout(rematchRedirectTimerRef.current);
    };
  }, []);

  const joinAsSpectator = useCallback(async () => {
    try {
      const savedName = localStorage.getItem('ek_playerName') || 'Spectator';
      const savedAvatar = parseInt(localStorage.getItem('ek_avatar') || '0');
      const res = await fetch(`/api/games/${gameId}/spectate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: savedName, avatar: savedAvatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSpectatorId(data.spectatorId);
      setSpectatorName(savedName);
      localStorage.setItem(`ek_spectator_${gameId}`, data.spectatorId);
      localStorage.setItem(`ek_spectatorName_${gameId}`, savedName);
      setGame(data.game);
      lastActionIdRef.current = data.game.lastActionId;
      setLoading(false);
    } catch (err: unknown) {
      console.error('Spectate join error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to join as spectator');
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (spectateParam === 'true') {
      const existingSpecId = localStorage.getItem(`ek_spectator_${gameId}`);
      if (existingSpecId) {
        setSpectatorId(existingSpecId);
        setSpectatorName(localStorage.getItem(`ek_spectatorName_${gameId}`) || 'Spectator');
        fetch(`/api/games/${gameId}?spectatorId=${existingSpecId}`)
          .then(r => r.json())
          .then(data => { setGame(data.game); lastActionIdRef.current = data.game.lastActionId; setLoading(false); })
          .catch(() => joinAsSpectator());
      } else {
        joinAsSpectator();
      }
      return;
    }
    const pid = localStorage.getItem(`ek_player_${gameId}`) || playerIdParam;
    if (!pid) { router.push('/'); return; }
    localStorage.setItem(`ek_player_${gameId}`, pid);
    setPlayerId(pid);
    const stats = getStats();
    setRankTitle(getRankInfo(stats).title);
    setLevelInfo(getLevelInfo(stats));
    fetchGame(pid);
  }, [gameId, fetchGame, playerIdParam, router, spectateParam, joinAsSpectator]);

  useEffect(() => {
    if (isMyTurn && game?.status === 'playing') {
      sounds?.turnStart();
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, [isMyTurn, game?.currentPlayerIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!actionLoading) return;
    const timeout = setTimeout(() => { setActionLoading(false); fetchGame(); }, 15000);
    return () => clearTimeout(timeout);
  }, [actionLoading, fetchGame]);

  useEffect(() => {
    const stateToText = () => JSON.stringify({
      coordinateSystem: 'N/A (card table)', gameId,
      status: game?.status ?? 'missing', code: game?.code ?? null,
      playersAlive: game?.players.filter(p => p.isAlive).length ?? 0,
      deckCount: game?.deck.length ?? 0,
      discardTop: game?.discardPile.at(-1)?.type ?? null,
      currentPlayerId: currentPlayer?.id ?? null,
      currentPlayerName: currentPlayer?.name ?? null,
      myPlayerId: playerId || null,
      myState: myPlayer ? { isAlive: myPlayer.isAlive, handCount: myPlayer.hand.length, handTypes: myPlayer.hand.map(card => card.type) } : null,
      turnsRemaining: game?.turnsRemaining ?? 0,
      pendingAction: game?.pendingAction?.type ?? null,
      selectedCards,
      progression: { level: levelInfo.level, levelProgressPct: Math.round(levelInfo.progress * 100), xpToNext: Math.max(0, levelInfo.nextLevelXp - levelInfo.xp), xpGain },
      ui: { selectingTarget, selectingThreeTarget, showSeeFuture, showDefuseModal, showWinner },
    });
    const win = window as Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => Promise<void> };
    win.render_game_to_text = stateToText;
    win.advanceTime = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
    return () => { delete win.render_game_to_text; delete win.advanceTime; };
  }, [currentPlayer?.id, currentPlayer?.name, game, gameId, myPlayer, playerId, selectedCards, selectingTarget, selectingThreeTarget, showDefuseModal, showSeeFuture, showWinner, levelInfo, xpGain]);

  async function sendAction(actionData: Record<string, unknown>) {
    if (actionLoading) return;
    setActionLoading(true);
    const oldHand = myPlayer?.hand ? [...myPlayer.hand] : [];
    const oldPlayerAlive = myPlayer?.isAlive ?? true;
    let isExplodingKittenDraw = false;
    try {
      const res = await fetch(`/api/games/${gameId}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          triggerFlash(CARD_INFO[playedCard.type].color);
          if (!['exploding_kitten', 'defuse', 'see_the_future'].includes(playedCard.type)) {
            if (isCatCard(playedCard.type)) {
              const comboCount = (actionData.cardIds as string[] | undefined)?.length === 3 ? 3 : 2;
              setCardAction({ type: 'cat_combo', actorName: myPlayer?.name ?? 'You', comboCount: comboCount as 2 | 3 });
            } else {
              setCardAction({ type: playedCard.type as CardActionType, actorName: myPlayer?.name ?? 'You' });
            }
          }
        }
      } else if (actionData.type === 'draw') {
        sounds?.cardDraw();
        const me = data.game.players.find((p: Player) => p.id === playerId);
        const newHand = me?.hand || [];
        const drawnCard = newHand.find((newCard: Card) => !oldHand.some((oldCard) => oldCard.id === newCard.id));
        if (drawnCard) {
          const hasDefuse = newHand.some((c: Card) => c.type === 'defuse');
          isExplodingKittenDraw = drawnCard.type === 'exploding_kitten';
          setDrawAnimation({ isPlaying: true, phase: 'travel', drawnCardType: drawnCard.type, hasDefuse: hasDefuse && isExplodingKittenDraw, actorName: me?.name ?? 'You' });
        }
      } else if (actionData.type === 'defuse_place') {
        applyProgressUpdate(recordDefuseUsed());
      } else if (actionData.type === 'steal_target' || actionData.type === 'three_of_kind_target') {
        applyProgressUpdate(recordCardsStolen(1));
      }
      const me = data.game.players.find((p: Player) => p.id === playerId);
      if (me && !me.isAlive && oldPlayerAlive) {
        if (isExplodingKittenDraw && !drawAnimation.hasDefuse) {
          setPendingExplosion({ name: me.name, avatar: me.avatar, isMe: true });
        } else {
          triggerExplosion({ name: me.name, avatar: me.avatar, isMe: true });
          applyProgressUpdate(recordExplosion());
        }
      }
      handlePendingAction(data.game, playerId, isExplodingKittenDraw);
      if (data.game.status === 'finished') handleGameEnd(data.game);
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
    const isIK = g?.pendingAction?.type === 'imploding_kitten_place';
    setShowDefuseModal(false);
    setDefusePosition(0);
    sendAction({ type: isIK ? 'imploding_kitten_place' : 'defuse_place', position: randomPos });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defuseTimedOut]);

  const handleCardClick = useCallback((card: Card) => {
    const g = gameRef.current;
    const myP = g?.players.find(p => p.id === playerId);
    if (g?.pendingAction?.type === 'favor_give' && g?.pendingAction?.playerId === playerId) {
      sendAction({ type: 'favor_give', cardId: card.id });
      return;
    }
    sounds?.click();
    if (isCatCard(card.type)) {
      setSelectedCards(prev => {
        if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
        const currentType = prev.length > 0 ? myP?.hand.find(c => c.id === prev[0])?.type : null;
        const isCompatible = !currentType || currentType === card.type || currentType === 'feral_cat' || card.type === 'feral_cat';
        if (!isCompatible) return [card.id];
        if (prev.length >= 3) return prev;
        return [...prev, card.id];
      });
    } else {
      setSelectedCards(prev => prev.includes(card.id) ? [] : [card.id]);
    }
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const playSelected = useCallback(() => {
    const g = gameRef.current;
    const myP = g?.players.find(p => p.id === playerId);
    if (selectedCards.length === 0) return;
    const card = myP?.hand.find(c => c.id === selectedCards[0]);
    if (!card) return;
    if (selectedCards.length >= 2 && isCatCard(card.type)) {
      sendAction({ type: 'play_card', cardId: selectedCards[0], cardIds: selectedCards });
      return;
    }
    if (card.type === 'favor') { setSelectingTarget(true); return; }
    sendAction({ type: 'play_card', cardId: card.id });
  }, [playerId, selectedCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawCard = useCallback(() => {
    const g = gameRef.current;
    const currentP = g ? g.players[g.currentPlayerIndex] : null;
    if (currentP?.id !== playerId || !!g?.pendingAction || actionLoadingRef.current) return;
    const deckBtn = document.getElementById('draw-pile-btn');
    if (deckBtn) {
      const rect = deckBtn.getBoundingClientRect();
      setDeckElementPos({ x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 });
    }
    sendAction({ type: 'draw' });
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleThreeOfKindSelect(targetId: string, cardType: CardType) {
    sendAction({ type: 'three_of_kind_target', targetPlayerId: targetId, targetCardType: cardType });
    setSelectingThreeTarget(false);
  }

  function handleTargetSelect(targetId: string) {
    const g = gameRef.current;
    if (g?.pendingAction?.type === 'steal_target') {
      sendAction({ type: 'steal_target', targetPlayerId: targetId });
      setSelectingTarget(false);
      sounds?.steal();
      return;
    }
    const myP = g?.players.find(p => p.id === playerId);
    const selectedCardObj = myP?.hand.find(c => c.id === selectedCards[0]);
    if (selectedCardObj?.type === 'favor') {
      sendAction({ type: 'play_card', cardId: selectedCardObj.id, targetPlayerId: targetId });
      setSelectingTarget(false);
      setSelectedCards([]);
      return;
    }
    setSelectingTarget(false);
  }

  async function startMultiplayerGame() {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const handleEmote = useCallback((emote: string) => { setFloatingEmote(emote); }, []);

  async function handleRematch() {
    if (!game) return;
    if (game.isMultiplayer) {
      setRematchLoading(true);
      try {
        const res = await fetch(`/api/games/${gameId}/rematch`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.status === 'ready' && data.rematchGameId) {
          if (data.playerIdMap?.[playerId]) localStorage.setItem(`ek_player_${data.rematchGameId}`, data.playerIdMap[playerId]);
          setRematchGameId(data.rematchGameId);
          setRematchCountdown(Date.now());
          rematchRedirectTimerRef.current = setTimeout(() => router.push(`/game/${data.rematchGameId}`), data.countdownMs || 5000);
        } else {
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
    setRematchLoading(true);
    try {
      const savedName = localStorage.getItem('ek_playerName') || myPlayer?.name || 'Player';
      const savedAvatar = localStorage.getItem('ek_avatar');
      const avatarIdx = savedAvatar ? parseInt(savedAvatar) : (myPlayer?.avatar || 0);
      const aiPlayers = game.players.filter(p => p.isAI);
      const res = await fetch('/api/games', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: savedName, avatar: avatarIdx, mode: 'single', aiCount: aiPlayers.length, aiDifficulty: aiPlayers[0]?.difficulty, bestOf: game.series?.bestOf }),
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
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === '?') { event.preventDefault(); setShowHotkeys(prev => !prev); return; }
      if (event.key === 'Escape') { setSelectedCards([]); setSelectingTarget(false); setSelectingThreeTarget(false); setShowHotkeys(false); return; }
      if (!game || game.status !== 'playing' || showWinner) return;
      if (event.key.toLowerCase() === 'd') { event.preventDefault(); drawCard(); return; }
      if ((event.key === 'Enter' || event.key.toLowerCase() === 'p') && canPlay) { event.preventDefault(); playSelected(); return; }
      if (event.key.toLowerCase() === 'l') { event.preventDefault(); setShowLog(prev => !prev); }
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

  if (spectatorId && game) {
    return <SpectatorView game={game} spectatorId={spectatorId} spectatorName={spectatorName} onLeave={() => router.push('/')} />;
  }

  if (!game) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4 bg-[#090714]">
        <p className="text-4xl mb-2">😿</p>
        <p className="text-xl text-center">Game not found</p>
        <p className="text-text-muted text-sm text-center">This game may have expired or the link is incorrect.</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => fetchGame(playerId)} className="px-5 py-3 rounded-xl bg-surface-light border border-border text-text font-bold active:border-accent transition-colors min-h-[44px]">Retry</button>
          <button onClick={() => router.push('/')} className="px-5 py-3 rounded-xl bg-gradient-to-r from-accent to-[#ff8855] text-white font-bold min-h-[44px]">Go Home</button>
        </div>
      </div>
    );
  }

  if (game.status === 'waiting') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-[#090714]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[1.75rem] max-w-lg w-full p-5 md:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="status-pill">Lobby Open</span>
            {game.series && <span className="status-pill bg-warning/20 border-warning/40 text-warning">Best of {game.series.bestOf}</span>}
          </div>
          <h2 className="display-font text-3xl text-warning mb-2">Invite Your Friends</h2>
          <p className="text-text-muted mb-5">Share this code and fill the table.</p>
          <motion.div className="bg-surface-light/80 border-2 border-accent rounded-2xl p-5 mb-5" animate={{ borderColor: ['#ff5f2e', '#ff844f', '#ff5f2e'] }} transition={{ duration: 2, repeat: Infinity }}>
            <p className="text-4xl md:text-5xl font-mono font-black tracking-[0.38em] text-accent">{game.code}</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button onClick={() => { navigator.clipboard.writeText(game.code); toast.success('Code copied'); }} className="cta-ghost py-2 text-sm">Copy Code</button>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?join=${game.code}`); toast.success('Invite link copied'); }} className="cta-ghost py-2 text-sm">Copy Invite Link</button>
          </div>
          <div className="space-y-2 mb-6">
            <p className="text-sm text-text-muted text-left">Players ({game.players.length}/5)</p>
            {game.players.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 bg-surface-light/80 rounded-xl p-3 border border-border/80">
                <span className="text-2xl">{AVATARS[p.avatar]}</span>
                <span className="font-bold">{p.name}</span>
                {p.id === game.hostId && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">Host</span>}
              </motion.div>
            ))}
          </div>
          {game.hostId === playerId && game.players.length >= 2 && (
            <motion.button id="start-lobby-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={startMultiplayerGame} className="cta-primary w-full py-3.5 text-lg">
              Start Match ({game.players.length} players)
            </motion.button>
          )}
          {game.hostId !== playerId && <p className="text-text-muted animate-pulse">Waiting for host to launch the game...</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative game-container-layer bg-bg">
      <AnimatedBackground />
      <canvas ref={confettiRef} className="fixed inset-0 w-full h-full pointer-events-none z-[60]" />
      <canvas ref={particleRef} className="fixed inset-0 w-full h-full pointer-events-none z-[55]" />

      <CardActionAnimation action={cardAction} onDone={() => setCardAction(null)} />

      <DrawCardAnimation
        state={drawAnimation}
        onDone={() => {
          setDrawAnimation((prev) => ({ ...prev, isPlaying: false, phase: 'none' }));
          if (pendingExplosion) { triggerExplosion(pendingExplosion); applyProgressUpdate(recordExplosion()); setPendingExplosion(null); }
        }}
        onDefusePlace={() => {
          const g = gameRef.current;
          if (g?.pendingAction?.type === 'defuse_place' || g?.pendingAction?.type === 'imploding_kitten_place') setShowDefuseModal(true);
        }}
        deckPosition={deckElementPos || undefined}
      />

      <AnimatePresence>
        {flashColor && (
          <motion.div initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-[45] rounded-lg"
            style={{ boxShadow: `inset 0 0 60px 10px ${flashColor}` }}
          />
        )}
      </AnimatePresence>

      <ExplosionOverlay show={showExplosion} explodedPlayer={explodedPlayer} />

      <PostMatchSummary
        show={showPostMatchSummary}
        onClose={() => setShowPostMatchSummary(false)}
        onPlayAgain={handleRematch}
        onGoHome={() => router.push('/')}
        isWinner={game?.winnerId === playerId}
        gameId={gameId}
        matchStats={matchStats}
        progressUpdate={progressUpdate}
        series={game?.series}
        playerId={playerId}
        players={game?.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) || []}
      />

      <StatsDisplay show={showStats} onClose={() => setShowStats(false)} />
      <CardPreviewOverlay cardType={previewCardType} />
      <HotkeysModal show={showHotkeys} onClose={() => setShowHotkeys(false)} />

      <SeeFutureModal
        show={showSeeFuture}
        cards={seeFutureCards}
        onAck={() => { setShowSeeFuture(false); sendAction({ type: 'see_future_ack' }); }}
      />

      <DefusePlaceModal
        show={showDefuseModal}
        game={game}
        defusePosition={defusePosition}
        defuseCountdown={defuseCountdown}
        onPositionChange={setDefusePosition}
        onPlace={() => {
          const isIK = gameRef.current?.pendingAction?.type === 'imploding_kitten_place';
          if (defuseTimerRef.current) clearInterval(defuseTimerRef.current);
          setShowDefuseModal(false);
          sendAction({ type: isIK ? 'imploding_kitten_place' : 'defuse_place', position: defusePosition });
          setDefusePosition(0);
        }}
      />

      <ThreeOfKindModal
        show={selectingThreeTarget}
        targets={game.players.filter(p => p.isAlive && p.id !== playerId && p.hand.length > 0)}
        onSelect={handleThreeOfKindSelect}
        onCancel={() => setSelectingThreeTarget(false)}
      />

      <NopeWindowBanner
        game={game}
        myPlayer={myPlayer}
        playerId={playerId}
        onNope={(cardId) => sendAction({ type: 'play_card', cardId })}
        onPass={() => sendAction({ type: 'nope_pass' })}
      />

      {/* MOBILE TOP BAR */}
      <div className="lg:hidden glass-panel border-x-0 border-t-0 rounded-none px-2 md:px-3 py-2 safe-top safe-x flex items-center gap-2 z-30">
        <div className="hidden sm:flex flex-col items-start gap-1">
          <span className="status-pill py-1 text-[10px]">Room {game.code}</span>
          {game.series
            ? <SeriesScoreBar series={game.series} players={game.players} compact />
            : <button onClick={() => { navigator.clipboard.writeText(game.code); toast.success('Code copied'); }} className="text-[11px] text-text-muted active:text-accent min-h-[44px] flex items-center">Copy code</button>
          }
        </div>
        <div className="flex-1 overflow-x-auto scroll-touch">
          <OpponentBar players={game.players} currentPlayerId={currentPlayer?.id || ''} myId={playerId} onPlayerClick={selectableTargets ? handleTargetSelect : undefined} selectablePlayerIds={selectableTargets} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(game.spectators?.length || 0) > 0 && (
            <span className="px-2 py-1 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30 text-[10px] font-bold text-[#a5b4fc]">👁 {game.spectators!.length}</span>
          )}
          <button onClick={() => setShowHotkeys(prev => !prev)} className="w-10 h-10 rounded-lg bg-surface-light/85 border border-border flex items-center justify-center text-xs active:border-accent transition-colors">HK</button>
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
        <div className="absolute inset-0 z-40">
          <SpectatorView game={game} spectatorId={playerId} spectatorName={myPlayer.name} isEliminatedPlayer onLeave={() => router.push('/')} />
        </div>
      )}

      {/* MAIN GAME LAYOUT */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[16rem_1fr_14rem] lg:grid-rows-[1fr] overflow-hidden relative game-bg table-aura w-full max-w-[1800px] mx-auto z-10">

        {/* LEFT SIDEBAR */}
        <div className="hidden lg:flex flex-col gap-4 p-5 border-r border-white/5 bg-black/20 overflow-y-auto">
          <div className="glass-panel p-4 rounded-2xl text-center space-y-2">
            <span className="status-pill text-xs mb-1 block">Room {game.code}</span>
            <button onClick={() => { navigator.clipboard.writeText(game.code); toast.success('Code copied'); }} className="text-sm font-bold text-text-muted hover:text-accent transition-colors w-full bg-surface-light/50 py-2 rounded-xl border border-border">Copy Code</button>
            {game.isMultiplayer && (
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/game/${gameId}?spectate=true`); toast.success('Spectator link copied'); }} className="text-xs text-[#a5b4fc] hover:text-[#c7d2fe] transition-colors w-full bg-[#6366f1]/10 py-1.5 rounded-lg border border-[#6366f1]/20">
                👁 Copy Spectator Link
              </button>
            )}
          </div>
          <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 text-sm font-black text-text-muted uppercase tracking-wider bg-surface-light/40">Game Log</div>
            <div className="flex-1 overflow-y-auto p-3 scroll-touch text-sm"><GameLog logs={game.logs} /></div>
          </div>
        </div>

        {/* CENTER AREA */}
        <div className="flex-1 flex flex-col items-center justify-start lg:justify-between p-2 md:p-4 lg:p-6 overflow-y-auto overflow-x-hidden relative scroll-touch">
          <AnimatePresence>
            {floatingEmote && (
              <motion.div key={floatingEmote + Date.now()} initial={{ opacity: 0, scale: 0, y: 20 }} animate={{ opacity: 1, scale: 2, y: -60 }} exit={{ opacity: 0, y: -120 }} transition={{ duration: 1.5 }} onAnimationComplete={() => setFloatingEmote(null)} className="absolute top-1/4 left-1/2 -translate-x-1/2 text-5xl pointer-events-none z-20">
                {floatingEmote}
              </motion.div>
            )}
          </AnimatePresence>

          {game.series && (
            <div className="hidden lg:flex w-full justify-center pt-2 pb-1">
              <SeriesScoreBar series={game.series} players={game.players} />
            </div>
          )}

          <div className="hidden lg:flex w-full justify-center pb-8 pt-2">
            <div className="max-w-3xl w-full">
              <OpponentBar players={game.players} currentPlayerId={currentPlayer?.id || ''} myId={playerId} onPlayerClick={selectableTargets ? handleTargetSelect : undefined} selectablePlayerIds={selectableTargets} />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <motion.div key={game.currentPlayerIndex} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`text-center px-4 py-1.5 rounded-full text-sm font-bold border ${isMyTurn ? 'bg-accent/20 text-accent border-accent/40' : 'bg-surface-light/90 text-text-muted border-border'}`}>
              {isMyTurn
                ? <>Your Turn! {game.turnsRemaining > 1 && <span className="text-warning">({game.turnsRemaining} turns)</span>}</>
                : <span className="flex items-center gap-2">{currentPlayer?.name}&apos;s Turn{currentPlayer?.isAI && actionLoading && <span className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />}{game.turnsRemaining > 1 && <span className="text-warning">({game.turnsRemaining})</span>}</span>
              }
            </motion.div>
            <DangerMeter deckSize={game.deck.length} alivePlayers={alivePlayers} defuseCount={myPlayer?.hand.filter(c => c.type === 'defuse').length ?? 0} discardedEKs={discardedEKs} />
            {game.expansionEnabled && game.playDirection === -1 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-[#1DA1F2]/20 border border-[#1DA1F2]/40 text-[#1DA1F2]">
                <span>↺</span><span>Reversed</span>
              </motion.div>
            )}
          </div>

          <div className="hidden lg:flex w-full justify-center items-center gap-3 mb-6">
            <motion.div key={`desk-${game.currentPlayerIndex}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`text-center px-6 py-2 rounded-full text-lg font-black tracking-wide border shadow-lg ${isMyTurn ? 'bg-accent/20 text-accent border-accent/50 shadow-accent/20' : 'bg-surface-light/90 text-text-muted border-border shadow-black/20'}`}>
              {isMyTurn
                ? <>IT&apos;S YOUR TURN! {game.turnsRemaining > 1 && <span className="text-warning ml-2">({game.turnsRemaining} turns left)</span>}</>
                : <span className="flex items-center gap-2">{currentPlayer?.name} is playing...{currentPlayer?.isAI && actionLoading && <span className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />}{game.turnsRemaining > 1 && <span className="text-warning ml-2">({game.turnsRemaining} turns)</span>}</span>
              }
            </motion.div>
            {game.expansionEnabled && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#7B2FBE]/20 border border-[#7B2FBE]/40 text-[#cc88ff]">
                <span>☢️</span><span>Imploding Kittens</span>
                {game.playDirection === -1 && <span className="text-[#1DA1F2] ml-1">↺ Reversed</span>}
              </div>
            )}
          </div>

          <motion.div key={actionHint} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full text-center text-xs md:text-sm lg:text-base lg:font-bold text-text-muted bg-surface-light/70 lg:bg-black/40 border border-border/80 lg:border-white/10 rounded-full px-4 py-2 lg:px-6 lg:py-3 mb-4 lg:mb-8 shadow-inner">
            {actionHint}
          </motion.div>

          <AnimatePresence>
            {xpGain !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs lg:text-sm font-black tracking-[0.08em] uppercase text-success bg-success/10 border border-success/40 rounded-full px-3 py-1 lg:px-4 lg:py-2 mb-4 lg:absolute lg:top-1/4 lg:right-1/4">
                +{xpGain} XP
              </motion.div>
            )}
          </AnimatePresence>

          {game.logs.length > 0 && (
            <motion.div key={game.logs[game.logs.length - 1].timestamp} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full text-center text-[11px] md:text-xs text-text bg-surface/65 border border-border/70 rounded-full px-3 py-1.5 truncate lg:hidden mb-4" title={game.logs[game.logs.length - 1].message}>
              Last action: {game.logs[game.logs.length - 1].message}
            </motion.div>
          )}

          <div className="flex items-center gap-6 md:gap-10 lg:gap-20 rounded-3xl lg:rounded-[3rem] bg-surface/60 lg:bg-black/30 border border-border/70 lg:border-white/10 px-6 py-5 lg:px-12 lg:py-10 shadow-xl lg:shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] lg:mb-12 transition-transform">
            <div className="lg:scale-[1.3] lg:origin-center">
              <DrawPile
                count={game.deck.length}
                onClick={drawCard}
                disabled={actionLoading || hasPendingAction}
                isMyTurn={isMyTurn}
                implodingKittenPosition={game.deck.findIndex(c => c.faceUp && c.type === 'imploding_kitten') >= 0 ? game.deck.findIndex(c => c.faceUp && c.type === 'imploding_kitten') : null}
              />
            </div>
            <div className="lg:scale-[1.3] lg:origin-center">
              <DiscardPile cards={game.discardPile} onPreview={setPreviewCardType} onPreviewEnd={() => setPreviewCardType(null)} />
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto">
            <ComboCoach hand={myPlayer?.hand || []} isMyTurn={isMyTurn} hasPendingAction={hasPendingAction} selectingTarget={selectingTarget} selectingThreeTarget={selectingThreeTarget} deckSize={game.deck.length} alivePlayers={alivePlayers} discardedEKs={discardedEKs} />
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

        {/* RIGHT SIDEBAR */}
        <div className="hidden lg:flex flex-col gap-4 p-5 border-l border-white/5 bg-black/20 overflow-y-auto">
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-5">
            <DangerMeter deckSize={game.deck.length} alivePlayers={alivePlayers} defuseCount={myPlayer?.hand.filter(c => c.type === 'defuse').length ?? 0} discardedEKs={discardedEKs} />
          </div>
          {(game.spectators?.length || 0) > 0 && (
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-2">
              <span className="text-sm">👁</span>
              <span className="text-xs font-bold text-[#a5b4fc]">{game.spectators!.length} spectator{game.spectators!.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success to-accent"></div>
            <div className="flex items-center justify-between text-sm font-black text-text uppercase tracking-widest">
              <span>Level {levelInfo.level}</span>
            </div>
            <div className="h-3 rounded-full bg-surface overflow-hidden shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-success to-accent" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
            </div>
            <div className="text-xs text-text-muted text-right font-bold mt-1">{Math.max(0, levelInfo.nextLevelXp - levelInfo.xp)} XP to next</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
            <button onClick={() => setShowHotkeys(true)} className="w-full py-3 bg-surface-light border border-border rounded-xl text-sm font-bold hover:border-accent hover:text-accent transition-colors">Keyboard Shortcuts</button>
            <div className="flex gap-2">
              <div className="flex-1 flex justify-center py-2 bg-surface-light border border-border rounded-xl"><SoundToggle /></div>
              <div className="flex-1 flex justify-center py-2 bg-surface-light border border-border rounded-xl"><QuickEmotes onEmote={handleEmote} /></div>
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
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-accent border-2 border-[#130f25] shadow-[0_0_12px_var(--color-accent)]" />
              )}
            </div>
            <div>
              <p className={`font-black text-[15px] lg:text-xl tracking-wide leading-none mb-1 lg:mb-2 text-white/95 ${myPlayer && !myPlayer.isAlive ? 'line-through text-danger/80' : ''}`}>
                {myPlayer?.name || 'You'}
              </p>
              <div className="flex items-center gap-1.5">
                {myPlayer?.isAlive
                  ? <span className="text-[10px] lg:text-xs text-text-muted font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md text-white/70 shadow-inner">{myPlayer.hand.length} <span className="opacity-50">CARDS</span></span>
                  : <span className="text-[10px] lg:text-xs text-danger font-bold uppercase tracking-widest bg-danger/10 px-1.5 py-0.5 lg:px-3 lg:py-1 rounded-md">💀 DEAD</span>
                }
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
              <motion.button id="play-selected-btn" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.93 }} onClick={playSelected}
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
