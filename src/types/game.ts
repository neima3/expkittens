export type CardType =
  | 'exploding_kitten'
  | 'imploding_kitten'
  | 'defuse'
  | 'attack'
  | 'skip'
  | 'favor'
  | 'shuffle'
  | 'see_the_future'
  | 'nope'
  | 'reverse'
  | 'draw_from_bottom'
  | 'taco_cat'
  | 'rainbow_cat'
  | 'beard_cat'
  | 'cattermelon'
  | 'potato_cat'
  | 'feral_cat';

export interface Card {
  id: string;
  type: CardType;
  faceUp?: boolean; // imploding_kitten placed face-up in deck
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'ruthless';

export interface Player {
  id: string;
  persistentId?: string; // stable browser-local identity, carried across rematch games
  name: string;
  hand: Card[];
  isAlive: boolean;
  isAI: boolean;
  avatar: number; // 0-7 avatar index
  difficulty?: AIDifficulty; // AI difficulty tier
}

export interface GameAction {
  type: 'play_card' | 'draw' | 'defuse_place' | 'imploding_kitten_place' | 'favor_give' | 'nope' | 'nope_pass' | 'nope_resolve' | 'see_future_ack' | 'steal_target' | 'three_of_kind_target';
  playerId: string;
  cardId?: string;
  cardIds?: string[];
  targetPlayerId?: string;
  targetCardType?: CardType;
  position?: number; // for defuse / imploding_kitten placement
}

export interface PendingAction {
  type: 'favor_give' | 'defuse_place' | 'imploding_kitten_place' | 'nope_window' | 'see_future' | 'steal_target' | 'three_of_kind_target';
  playerId: string; // player who needs to respond
  sourcePlayerId?: string; // player who initiated
  cards?: Card[]; // for see_future
  cardPlayed?: CardType; // card that triggered this
  expiresAt?: number;
  // Nope window fields
  nopeChain?: string[]; // player IDs who played Nopes (ordered)
  passedPlayerIds?: string[]; // players who explicitly passed on Nope
  originalAction?: Omit<GameAction, 'playerId'> & { playerId: string }; // the action being contested
}

export interface SeriesMatchResult {
  gameId: string;
  winnerId: string;
  winnerName: string;
  matchNumber: number;
}

export interface SeriesState {
  seriesId: string;
  bestOf: 3 | 5;
  currentMatch: number; // 1-indexed
  scores: Record<string, number>; // playerId -> wins
  playerNames: Record<string, string>; // playerId -> name (stable across rematches)
  history: SeriesMatchResult[];
  seriesWinnerId?: string; // set when series is decided
}

export interface Spectator {
  id: string;
  name: string;
  avatar: number;
  joinedAt: number;
}

export type GameLogType = 'system' | 'chat' | 'preset' | 'spectator_chat';

export interface GameLog {
  message: string;
  timestamp: number;
  playerId?: string;
  type?: GameLogType; // undefined = system (backwards compatible)
  playerName?: string; // for chat messages
}

export interface GameState {
  id: string;
  code: string;
  status: GameStatus;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  turnsRemaining: number; // for attack stacking
  pendingAction: PendingAction | null;
  winnerId: string | null;
  logs: GameLog[];
  createdAt: number;
  updatedAt: number;
  isMultiplayer: boolean;
  hostId: string;
  lastActionId: number;
  // Expansion fields
  expansionEnabled?: boolean;
  playDirection: 1 | -1; // 1 = forward (default), -1 = reversed
  // Rematch fields (multiplayer)
  rematchRequests?: string[]; // player IDs who want a rematch
  rematchGameId?: string; // new game ID once rematch is created
  rematchCountdown?: number; // timestamp when countdown started (all accepted)
  // Series/tournament fields
  series?: SeriesState;
  // Spectator fields
  spectators?: Spectator[];
}

export const CARD_INFO: Record<CardType, { name: string; description: string; emoji: string; color: string }> = {
  exploding_kitten: {
    name: 'Exploding Kitten',
    description: 'You explode! Play a Defuse card or you\'re out.',
    emoji: '💣',
    color: '#FF4444',
  },
  defuse: {
    name: 'Defuse',
    description: 'Save yourself from an Exploding Kitten. Place it back in the deck.',
    emoji: '🔧',
    color: '#44BB44',
  },
  attack: {
    name: 'Attack',
    description: 'End your turn without drawing. Next player takes 2 turns.',
    emoji: '⚔️',
    color: '#FF8800',
  },
  skip: {
    name: 'Skip',
    description: 'End your turn without drawing a card.',
    emoji: '⏭️',
    color: '#4488FF',
  },
  favor: {
    name: 'Favor',
    description: 'Force another player to give you a card of their choice.',
    emoji: '🎁',
    color: '#AA44FF',
  },
  shuffle: {
    name: 'Shuffle',
    description: 'Shuffle the draw pile.',
    emoji: '🔀',
    color: '#44CCCC',
  },
  see_the_future: {
    name: 'See the Future',
    description: 'Peek at the top 3 cards of the draw pile.',
    emoji: '🔮',
    color: '#FF44AA',
  },
  nope: {
    name: 'Nope',
    description: 'Cancel any action card played by another player.',
    emoji: '✋',
    color: '#888888',
  },
  taco_cat: {
    name: 'Taco Cat',
    description: 'Collect pairs to steal cards from other players.',
    emoji: '🌮',
    color: '#FFD700',
  },
  rainbow_cat: {
    name: 'Rainbow Cat',
    description: 'Collect pairs to steal cards from other players.',
    emoji: '🌈',
    color: '#FF69B4',
  },
  beard_cat: {
    name: 'Beard Cat',
    description: 'Collect pairs to steal cards from other players.',
    emoji: '🧔',
    color: '#8B4513',
  },
  cattermelon: {
    name: 'Cattermelon',
    description: 'Collect pairs to steal cards from other players.',
    emoji: '🍉',
    color: '#32CD32',
  },
  potato_cat: {
    name: 'Potato Cat',
    description: 'Collect pairs to steal cards from other players.',
    emoji: '🥔',
    color: '#DEB887',
  },
  // Imploding Kittens expansion
  imploding_kitten: {
    name: 'Imploding Kitten',
    description: 'Draw this face-down and place it back face-up. Draw it face-up and you instantly implode — no Defuse can save you!',
    emoji: '☢️',
    color: '#7B2FBE',
  },
  reverse: {
    name: 'Reverse',
    description: 'Reverse the direction of play. Also counts as a Skip for the current player.',
    emoji: '🔄',
    color: '#1DA1F2',
  },
  draw_from_bottom: {
    name: 'Draw from the Bottom',
    description: 'Draw the bottom card of the deck instead of the top.',
    emoji: '⬇️',
    color: '#E67E22',
  },
  feral_cat: {
    name: 'Feral Cat',
    description: 'Wild cat card — pairs with any other cat card for a steal, or forms any triple combo.',
    emoji: '😾',
    color: '#2ECC71',
  },
};

export const CAT_CARD_TYPES: CardType[] = ['taco_cat', 'rainbow_cat', 'beard_cat', 'cattermelon', 'potato_cat', 'feral_cat'];
export const ACTION_CARD_TYPES: CardType[] = ['attack', 'skip', 'favor', 'shuffle', 'see_the_future', 'nope', 'reverse', 'draw_from_bottom'];
export const EXPANSION_CARD_TYPES: CardType[] = ['imploding_kitten', 'reverse', 'draw_from_bottom', 'feral_cat'];

export const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'] as const;

export const AI_DIFFICULTY_INFO: Record<AIDifficulty, { label: string; emoji: string; color: string; description: string }> = {
  easy: { label: 'Kitten', emoji: '😺', color: '#4ade80', description: 'Plays randomly — still learning how to cat' },
  normal: { label: 'Normal', emoji: '😼', color: '#38bdf8', description: 'Basic strategy, occasionally dangerous' },
  hard: { label: 'Hacker', emoji: '😾', color: '#f97316', description: 'Card counting, saves Nopes for Attacks' },
  ruthless: { label: 'Chaos Mode', emoji: '🙀', color: '#ef4444', description: 'Chains Attacks, pure aggression, no mercy' },
};
