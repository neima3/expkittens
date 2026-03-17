import { nanoid } from 'nanoid';
import type {
  Card,
  CardType,
  GameState,
  GameAction,
  Player,
  SeriesState,
} from '@/types/game';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createCard(type: CardType): Card {
  return { id: nanoid(8), type };
}

function buildDeck(playerCount: number): { deck: Card[]; playerHands: Card[][] } {
  const cards: Card[] = [];

  // 4 Attack cards
  for (let i = 0; i < 4; i++) cards.push(createCard('attack'));
  // 4 Skip cards
  for (let i = 0; i < 4; i++) cards.push(createCard('skip'));
  // 4 Favor cards
  for (let i = 0; i < 4; i++) cards.push(createCard('favor'));
  // 4 Shuffle cards
  for (let i = 0; i < 4; i++) cards.push(createCard('shuffle'));
  // 5 See the Future cards
  for (let i = 0; i < 5; i++) cards.push(createCard('see_the_future'));
  // 5 Nope cards
  for (let i = 0; i < 5; i++) cards.push(createCard('nope'));
  // 4 of each cat card = 20 cat cards
  const catTypes: CardType[] = ['taco_cat', 'rainbow_cat', 'beard_cat', 'cattermelon', 'potato_cat'];
  for (const catType of catTypes) {
    for (let i = 0; i < 4; i++) cards.push(createCard(catType));
  }

  // Shuffle the deck
  const shuffled = shuffle(cards);

  // Deal 7 cards to each player
  const playerHands: Card[][] = [];
  for (let p = 0; p < playerCount; p++) {
    const hand = shuffled.splice(0, 7);
    // Give each player 1 Defuse card
    hand.push(createCard('defuse'));
    playerHands.push(hand);
  }

  // Add remaining Defuse cards (6 total - playerCount already dealt)
  const extraDefuses = Math.max(0, 6 - playerCount);
  for (let i = 0; i < extraDefuses; i++) {
    shuffled.push(createCard('defuse'));
  }

  // Add (playerCount - 1) Exploding Kittens
  for (let i = 0; i < playerCount - 1; i++) {
    shuffled.push(createCard('exploding_kitten'));
  }

  // Shuffle the final deck
  const finalDeck = shuffle(shuffled);

  return { deck: finalDeck, playerHands };
}

export function createGame(options: {
  hostId: string;
  hostName: string;
  hostAvatar: number;
  isMultiplayer: boolean;
  aiCount?: number;
  bestOf?: 3 | 5;
  existingSeries?: SeriesState;
}): GameState {
  const code = nanoid(6).toUpperCase();
  const players: Player[] = [
    {
      id: options.hostId,
      name: options.hostName,
      hand: [],
      isAlive: true,
      isAI: false,
      avatar: options.hostAvatar,
    },
  ];

  if (!options.isMultiplayer && options.aiCount) {
    const aiNames = ['Whiskers', 'Mittens', 'Shadow', 'Patches'];
    for (let i = 0; i < options.aiCount; i++) {
      players.push({
        id: `ai_${nanoid(6)}`,
        name: aiNames[i] || `Bot ${i + 1}`,
        hand: [],
        isAlive: true,
        isAI: true,
        avatar: i + 1,
      });
    }
  }

  // Build series state if starting a new series or continuing an existing one
  let series: SeriesState | undefined;
  if (options.existingSeries) {
    series = options.existingSeries;
  } else if (options.bestOf) {
    series = {
      seriesId: nanoid(10),
      bestOf: options.bestOf,
      currentMatch: 1,
      scores: {},
      playerNames: {},
      history: [],
    };
  }

  const game: GameState = {
    id: nanoid(12),
    code,
    status: 'waiting',
    players,
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    turnsRemaining: 1,
    pendingAction: null,
    winnerId: null,
    logs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isMultiplayer: options.isMultiplayer,
    hostId: options.hostId,
    lastActionId: 0,
    series,
  };

  return game;
}

export function startGame(game: GameState): GameState {
  const playerCount = game.players.length;
  if (playerCount < 2) throw new Error('Need at least 2 players');

  const { deck, playerHands } = buildDeck(playerCount);

  const players = game.players.map((p, i) => ({
    ...p,
    hand: playerHands[i],
  }));

  // Initialize series scores/names for all players on first match
  let series = game.series;
  if (series && series.currentMatch === 1) {
    const scores: Record<string, number> = {};
    const playerNames: Record<string, string> = {};
    for (const p of players) {
      scores[p.name] = 0;
      playerNames[p.id] = p.name;
    }
    series = { ...series, scores, playerNames };
  }

  const startLogs = [{ message: 'Game started!', timestamp: Date.now() }];
  if (series) {
    const winsNeeded = Math.ceil(series.bestOf / 2);
    startLogs.push({
      message: `Series Match ${series.currentMatch} of ${series.bestOf} (First to ${winsNeeded} wins)`,
      timestamp: Date.now(),
    });
  }

  return {
    ...game,
    status: 'playing',
    players,
    deck,
    discardPile: [],
    currentPlayerIndex: 0,
    turnsRemaining: 1,
    logs: startLogs,
    updatedAt: Date.now(),
    lastActionId: game.lastActionId + 1,
    series,
  };
}

export function getNextAlivePlayerIndex(game: GameState, fromIndex: number): number {
  const count = game.players.length;
  let idx = (fromIndex + 1) % count;
  while (!game.players[idx].isAlive) {
    idx = (idx + 1) % count;
    if (idx === fromIndex) break;
  }
  return idx;
}

function isCatCard(type: CardType): boolean {
  return ['taco_cat', 'rainbow_cat', 'beard_cat', 'cattermelon', 'potato_cat'].includes(type);
}

const NOPE_WINDOW_MS = 5000;

function isNopeableCard(type: CardType): boolean {
  return ['attack', 'skip', 'favor', 'shuffle', 'see_the_future'].includes(type);
}

function canAnyoneNope(state: GameState, excludePlayerId: string): boolean {
  return state.players.some(p => p.isAlive && p.id !== excludePlayerId && p.hand.some(c => c.type === 'nope'));
}

function createNopeWindow(state: GameState, action: GameAction, cardPlayed: CardType): GameState {
  // If nobody else has a Nope card, skip the window and execute immediately
  if (!canAnyoneNope(state, action.playerId)) {
    return executeNopeableAction(state, action, cardPlayed);
  }
  state.pendingAction = {
    type: 'nope_window',
    playerId: action.playerId,
    sourcePlayerId: action.playerId,
    cardPlayed,
    expiresAt: Date.now() + NOPE_WINDOW_MS,
    nopeChain: [],
    passedPlayerIds: [],
    originalAction: action,
  };
  state.logs.push({ message: `Waiting for Nope responses...`, timestamp: Date.now() });
  return state;
}

function executeNopeableAction(state: GameState, action: GameAction, cardPlayed: CardType): GameState {
  const player = state.players.find(p => p.id === action.playerId)!;
  switch (cardPlayed) {
    case 'attack': {
      state.logs.push({ message: `${player.name} played Attack!`, timestamp: Date.now(), playerId: player.id });
      const nextIdx = getNextAlivePlayerIndex(state, state.currentPlayerIndex);
      state.currentPlayerIndex = nextIdx;
      state.turnsRemaining = state.turnsRemaining + 1;
      break;
    }
    case 'skip': {
      state.logs.push({ message: `${player.name} played Skip!`, timestamp: Date.now(), playerId: player.id });
      state.turnsRemaining--;
      if (state.turnsRemaining <= 0) {
        state.currentPlayerIndex = getNextAlivePlayerIndex(state, state.currentPlayerIndex);
        state.turnsRemaining = 1;
      }
      break;
    }
    case 'shuffle': {
      state.deck = shuffle(state.deck);
      state.logs.push({ message: `${player.name} shuffled the deck!`, timestamp: Date.now(), playerId: player.id });
      break;
    }
    case 'see_the_future': {
      const topCards = state.deck.slice(0, 3);
      state.pendingAction = {
        type: 'see_future',
        playerId: action.playerId,
        cards: topCards,
      };
      state.logs.push({ message: `${player.name} is seeing the future...`, timestamp: Date.now(), playerId: player.id });
      break;
    }
    case 'favor': {
      if (!action.targetPlayerId) throw new Error('Must target a player for Favor');
      const target = state.players.find(p => p.id === action.targetPlayerId);
      if (!target || !target.isAlive) throw new Error('Invalid target');
      if (target.hand.length === 0) throw new Error('Target has no cards');
      state.pendingAction = {
        type: 'favor_give',
        playerId: action.targetPlayerId,
        sourcePlayerId: action.playerId,
        cardPlayed: 'favor',
      };
      state.logs.push({ message: `${player.name} asked ${target.name} for a Favor!`, timestamp: Date.now(), playerId: player.id });
      break;
    }
  }
  return state;
}

export function resolveNopeWindow(game: GameState): GameState {
  if (!game.pendingAction || game.pendingAction.type !== 'nope_window') return game;
  let state = { ...game, players: game.players.map(p => ({ ...p, hand: [...p.hand] })), deck: [...game.deck], discardPile: [...game.discardPile], logs: [...game.logs] };

  const nopeCount = state.pendingAction!.nopeChain?.length ?? 0;
  const originalAction = state.pendingAction!.originalAction!;
  const cardPlayed = state.pendingAction!.cardPlayed!;
  state.pendingAction = null;

  if (nopeCount % 2 === 1) {
    // Odd nopes = action cancelled
    const player = state.players.find(p => p.id === originalAction.playerId);
    state.logs.push({ message: `${player?.name}'s ${cardPlayed.replace(/_/g, ' ')} was Noped!`, timestamp: Date.now(), playerId: originalAction.playerId });
  } else {
    // Even nopes (including 0) = action proceeds
    state = executeNopeableAction(state, originalAction, cardPlayed);
  }

  state.updatedAt = Date.now();
  state.lastActionId++;
  return state;
}

export function processAction(game: GameState, action: GameAction): GameState {
  let state = { ...game, players: game.players.map(p => ({ ...p, hand: [...p.hand] })), deck: [...game.deck], discardPile: [...game.discardPile], logs: [...game.logs] };

  const player = state.players.find(p => p.id === action.playerId);
  if (!player) throw new Error('Player not found');
  if (!player.isAlive) throw new Error('Player is eliminated');

  switch (action.type) {
    case 'play_card': {
      if (!action.cardId) throw new Error('No card specified');
      const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
      if (cardIndex === -1) throw new Error('Card not in hand');
      const card = player.hand[cardIndex];

      // Check if it's a pair play
      if (action.cardIds && action.cardIds.length === 2 && isCatCard(card.type)) {
        // Playing a pair - steal from target
        const card2Index = player.hand.findIndex(c => c.id === action.cardIds![1]);
        if (card2Index === -1) throw new Error('Second card not in hand');
        const card2 = player.hand[card2Index];
        if (card.type !== card2.type) throw new Error('Cards must match for pair');

        // Remove both cards
        player.hand = player.hand.filter(c => c.id !== action.cardIds![0] && c.id !== action.cardIds![1]);
        state.discardPile.push(card, card2);

        state.pendingAction = {
          type: 'steal_target',
          playerId: action.playerId,
          sourcePlayerId: action.playerId,
          cardPlayed: card.type,
        };
        state.logs.push({ message: `${player.name} played a pair of ${card.type.replace(/_/g, ' ')}s!`, timestamp: Date.now(), playerId: player.id });
        break;
      }

      // Check for three of a kind
      if (action.cardIds && action.cardIds.length === 3 && isCatCard(card.type)) {
        const allSameType = action.cardIds.every(id => {
          const c = player.hand.find(h => h.id === id);
          return c && c.type === card.type;
        });
        if (!allSameType) throw new Error('All three cards must match');

        // Collect cards before removing them
        const removedCards = action.cardIds.map(id => player.hand.find(c => c.id === id)!).filter(Boolean);
        player.hand = player.hand.filter(c => !action.cardIds!.includes(c.id));
        state.discardPile.push(...removedCards);

        state.pendingAction = {
          type: 'three_of_kind_target',
          playerId: action.playerId,
          sourcePlayerId: action.playerId,
          cardPlayed: card.type,
        };
        state.logs.push({ message: `${player.name} played three ${card.type.replace(/_/g, ' ')}s!`, timestamp: Date.now(), playerId: player.id });
        break;
      }

      // Single card plays
      player.hand.splice(cardIndex, 1);
      state.discardPile.push(card);

      if (card.type === 'nope') {
        // Nope during a nope window — add to chain
        if (state.pendingAction?.type === 'nope_window') {
          state.pendingAction.nopeChain = [...(state.pendingAction.nopeChain || []), player.id];
          state.pendingAction.passedPlayerIds = []; // Reset passes for new nope window
          state.pendingAction.expiresAt = Date.now() + NOPE_WINDOW_MS;
          state.logs.push({ message: `${player.name} played Nope! (${state.pendingAction.nopeChain.length} in chain)`, timestamp: Date.now(), playerId: player.id });
          // Check if anyone else can counter-nope
          if (!canAnyoneNope(state, player.id)) {
            // No one can counter — resolve immediately
            state = resolveNopeWindow(state);
          }
        } else {
          throw new Error('Nothing to Nope — play Nope during a Nope window');
        }
      } else if (isNopeableCard(card.type)) {
        // Nopeable card — create a nope window instead of executing immediately
        state.logs.push({ message: `${player.name} played ${card.type.replace(/_/g, ' ')}!`, timestamp: Date.now(), playerId: player.id });
        state = createNopeWindow(state, action, card.type);
      } else {
        if (isCatCard(card.type)) {
          throw new Error('Cat cards must be played in pairs or triples');
        }
      }
      break;
    }

    case 'draw': {
      if (state.currentPlayerIndex !== state.players.indexOf(player)) {
        throw new Error('Not your turn');
      }
      if (state.pendingAction) throw new Error('Must resolve pending action first');

      if (state.deck.length === 0) throw new Error('Deck is empty');

      const drawnCard = state.deck.shift()!;

      if (drawnCard.type === 'exploding_kitten') {
        // Check for Defuse
        const defuseIndex = player.hand.findIndex(c => c.type === 'defuse');
        if (defuseIndex !== -1) {
          state.pendingAction = {
            type: 'defuse_place',
            playerId: player.id,
            cardPlayed: 'exploding_kitten',
          };
          // Remove defuse from hand
          player.hand.splice(defuseIndex, 1);
          state.discardPile.push(createCard('defuse'));
          state.logs.push({ message: `${player.name} drew an Exploding Kitten but has a Defuse!`, timestamp: Date.now(), playerId: player.id });
        } else {
          // Player explodes!
          player.isAlive = false;
          state.discardPile.push(drawnCard);
          state.discardPile.push(...player.hand);
          player.hand = [];
          state.logs.push({ message: `💥 ${player.name} drew an Exploding Kitten and EXPLODED!`, timestamp: Date.now(), playerId: player.id });

          // Check for winner
          const alivePlayers = state.players.filter(p => p.isAlive);
          if (alivePlayers.length === 1) {
            state.winnerId = alivePlayers[0].id;
            state.status = 'finished';
            state.logs.push({ message: `🏆 ${alivePlayers[0].name} wins!`, timestamp: Date.now(), playerId: alivePlayers[0].id });

            // Update series state
            if (state.series) {
              const winnerName = alivePlayers[0].name;
              const scores = { ...state.series.scores };
              scores[winnerName] = (scores[winnerName] || 0) + 1;
              const winsNeeded = Math.ceil(state.series.bestOf / 2);
              const history = [...state.series.history, {
                gameId: state.id,
                winnerId: alivePlayers[0].id,
                winnerName,
                matchNumber: state.series.currentMatch,
              }];
              const seriesWinnerId = scores[winnerName] >= winsNeeded ? alivePlayers[0].id : undefined;
              state.series = { ...state.series, scores, history, seriesWinnerId };

              if (seriesWinnerId) {
                state.logs.push({ message: `👑 ${winnerName} wins the series!`, timestamp: Date.now(), playerId: alivePlayers[0].id });
              } else {
                state.logs.push({ message: `Series: Match ${state.series.currentMatch} of ${state.series.bestOf} complete`, timestamp: Date.now() });
              }
            }
          } else {
            // Move to next player
            state.currentPlayerIndex = getNextAlivePlayerIndex(state, state.currentPlayerIndex);
            state.turnsRemaining = 1;
          }
        }
      } else {
        player.hand.push(drawnCard);
        state.logs.push({ message: `${player.name} drew a card.`, timestamp: Date.now(), playerId: player.id });

        // End turn
        state.turnsRemaining--;
        if (state.turnsRemaining <= 0) {
          state.currentPlayerIndex = getNextAlivePlayerIndex(state, state.currentPlayerIndex);
          state.turnsRemaining = 1;
        }
      }
      break;
    }

    case 'defuse_place': {
      if (!state.pendingAction || state.pendingAction.type !== 'defuse_place') {
        throw new Error('No defuse placement pending');
      }
      const pos = action.position ?? Math.floor(Math.random() * (state.deck.length + 1));
      const validPos = Math.max(0, Math.min(pos, state.deck.length));
      const ek = createCard('exploding_kitten');
      state.deck.splice(validPos, 0, ek);
      state.pendingAction = null;
      state.logs.push({ message: `${player.name} defused the Exploding Kitten and placed it back in the deck.`, timestamp: Date.now(), playerId: player.id });

      // End turn
      state.turnsRemaining--;
      if (state.turnsRemaining <= 0) {
        state.currentPlayerIndex = getNextAlivePlayerIndex(state, state.currentPlayerIndex);
        state.turnsRemaining = 1;
      }
      break;
    }

    case 'favor_give': {
      if (!state.pendingAction || state.pendingAction.type !== 'favor_give') {
        throw new Error('No favor pending');
      }
      if (!action.cardId) throw new Error('Must give a card');
      const cardIdx = player.hand.findIndex(c => c.id === action.cardId);
      if (cardIdx === -1) throw new Error('Card not in hand');

      const givenCard = player.hand.splice(cardIdx, 1)[0];
      const requester = state.players.find(p => p.id === state.pendingAction!.sourcePlayerId);
      if (requester) {
        requester.hand.push(givenCard);
      }
      state.logs.push({ message: `${player.name} gave a card to ${requester?.name}.`, timestamp: Date.now(), playerId: player.id });
      state.pendingAction = null;
      break;
    }

    case 'see_future_ack': {
      if (!state.pendingAction || state.pendingAction.type !== 'see_future') {
        throw new Error('No see future pending');
      }
      state.pendingAction = null;
      break;
    }

    case 'steal_target': {
      if (!state.pendingAction || state.pendingAction.type !== 'steal_target') {
        throw new Error('No steal pending');
      }
      if (!action.targetPlayerId) throw new Error('Must target a player');
      const target = state.players.find(p => p.id === action.targetPlayerId);
      if (!target || !target.isAlive || target.hand.length === 0) throw new Error('Invalid target');

      // Steal random card
      const randIdx = Math.floor(Math.random() * target.hand.length);
      const stolenCard = target.hand.splice(randIdx, 1)[0];
      player.hand.push(stolenCard);
      state.logs.push({ message: `${player.name} stole a card from ${target.name}!`, timestamp: Date.now(), playerId: player.id });
      state.pendingAction = null;
      break;
    }

    case 'three_of_kind_target': {
      if (!state.pendingAction || state.pendingAction.type !== 'three_of_kind_target') {
        throw new Error('No three of a kind pending');
      }
      if (!action.targetPlayerId || !action.targetCardType) throw new Error('Must target player and card type');
      const target3 = state.players.find(p => p.id === action.targetPlayerId);
      if (!target3 || !target3.isAlive) throw new Error('Invalid target');

      const targetCardIdx = target3.hand.findIndex(c => c.type === action.targetCardType);
      if (targetCardIdx !== -1) {
        const stolen = target3.hand.splice(targetCardIdx, 1)[0];
        player.hand.push(stolen);
        state.logs.push({ message: `${player.name} stole a ${action.targetCardType!.replace(/_/g, ' ')} from ${target3.name}!`, timestamp: Date.now(), playerId: player.id });
      } else {
        state.logs.push({ message: `${target3.name} doesn't have that card!`, timestamp: Date.now(), playerId: player.id });
      }
      state.pendingAction = null;
      break;
    }

    case 'nope_pass': {
      if (!state.pendingAction || state.pendingAction.type !== 'nope_window') {
        throw new Error('No Nope window active');
      }
      const passed = state.pendingAction.passedPlayerIds || [];
      if (!passed.includes(player.id)) {
        state.pendingAction.passedPlayerIds = [...passed, player.id];
      }
      // Check if all eligible players have passed
      const eligiblePlayers = state.players.filter(p =>
        p.isAlive && p.id !== state.pendingAction!.playerId && p.hand.some(c => c.type === 'nope')
        && !(state.pendingAction!.nopeChain?.length && state.pendingAction!.nopeChain[state.pendingAction!.nopeChain.length - 1] === p.id) // last noper can't pass on their own nope
      );
      const allPassed = eligiblePlayers.every(p => state.pendingAction!.passedPlayerIds!.includes(p.id));
      if (allPassed) {
        state = resolveNopeWindow(state);
      }
      break;
    }

    case 'nope_resolve': {
      if (!state.pendingAction || state.pendingAction.type !== 'nope_window') {
        throw new Error('No Nope window to resolve');
      }
      state = resolveNopeWindow(state);
      break;
    }
  }

  state.updatedAt = Date.now();
  state.lastActionId++;
  return state;
}

export function getPlayerView(game: GameState, playerId: string): GameState {
  // Return game state with hidden information for other players
  return {
    ...game,
    deck: game.deck.map(() => ({ id: 'hidden', type: 'exploding_kitten' as CardType })), // hide deck contents
    players: game.players.map(p => ({
      ...p,
      hand: p.id === playerId ? p.hand : p.hand.map(() => ({ id: 'hidden', type: 'exploding_kitten' as CardType })),
    })),
    pendingAction: game.pendingAction
      ? {
          ...game.pendingAction,
          cards: game.pendingAction.playerId === playerId ? game.pendingAction.cards : undefined,
        }
      : null,
  };
}
