export type CardType =
  | 'exploding_kitten'
  | 'defuse'
  | 'attack'
  | 'skip'
  | 'favor'
  | 'shuffle'
  | 'see_the_future'
  | 'nope'
  | 'taco_cat'
  | 'rainbow_cat'
  | 'beard_cat'
  | 'cattermelon'
  | 'potato_cat';

export interface Card {
  id: string;
  type: CardType;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isAlive: boolean;
  isAI: boolean;
  avatar: number; // 0-7 avatar index
}

export interface GameAction {
  type: 'play_card' | 'draw' | 'defuse_place' | 'favor_give' | 'nope' | 'nope_pass' | 'nope_resolve' | 'see_future_ack' | 'steal_target' | 'three_of_kind_target';
  playerId: string;
  cardId?: string;
  cardIds?: string[];
  targetPlayerId?: string;
  targetCardType?: CardType;
  position?: number; // for defuse placement
}

export interface PendingAction {
  type: 'favor_give' | 'defuse_place' | 'nope_window' | 'see_future' | 'steal_target' | 'three_of_kind_target';
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

export interface GameLog {
  message: string;
  timestamp: number;
  playerId?: string;
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
  // Rematch fields (multiplayer)
  rematchRequests?: string[]; // player IDs who want a rematch
  rematchGameId?: string; // new game ID once rematch is created
  rematchCountdown?: number; // timestamp when countdown started (all accepted)
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
};

export const CAT_CARD_TYPES: CardType[] = ['taco_cat', 'rainbow_cat', 'beard_cat', 'cattermelon', 'potato_cat'];
export const ACTION_CARD_TYPES: CardType[] = ['attack', 'skip', 'favor', 'shuffle', 'see_the_future', 'nope'];

export const AVATARS = ['😼', '😸', '🙀', '😻', '😹', '😾', '😺', '😿'] as const;
