import type { GameState, GameAction, CardType, Player, Card } from '@/types/game';
import { CAT_CARD_TYPES } from '@/types/game';
import { processAction } from './game-engine';

function isCatCard(type: CardType): boolean {
  return CAT_CARD_TYPES.includes(type);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getCardPriority(type: CardType): number {
  switch (type) {
    case 'defuse': return 0; // never play voluntarily
    case 'nope': return 1; // save for defense
    case 'see_the_future': return 8;
    case 'skip': return 7;
    case 'attack': return 9;
    case 'shuffle': return 6;
    case 'favor': return 5;
    default: return 3; // cat cards
  }
}

function findPairs(hand: Card[]): [Card, Card][] {
  const pairs: [Card, Card][] = [];
  const byType: Record<string, Card[]> = {};
  for (const card of hand) {
    if (isCatCard(card.type)) {
      if (!byType[card.type]) byType[card.type] = [];
      byType[card.type].push(card);
    }
  }
  for (const type in byType) {
    const cards = byType[type];
    for (let i = 0; i + 1 < cards.length; i += 2) {
      pairs.push([cards[i], cards[i + 1]]);
    }
  }
  return pairs;
}

export function getAIAction(game: GameState, aiPlayer: Player): GameAction | null {
  if (!aiPlayer.isAlive) return null;

  const hand = aiPlayer.hand;
  const isMyTurn = game.players[game.currentPlayerIndex].id === aiPlayer.id;

  // Handle pending actions first
  if (game.pendingAction) {
    if (game.pendingAction.type === 'favor_give' && game.pendingAction.playerId === aiPlayer.id) {
      // Give the least valuable card (never give defuse if possible)
      const nonDefuse = hand.filter(c => c.type !== 'defuse');
      const cardsToChooseFrom = nonDefuse.length > 0 ? nonDefuse : hand;
      const sorted = [...cardsToChooseFrom].sort((a, b) => getCardPriority(a.type) - getCardPriority(b.type));
      return {
        type: 'favor_give',
        playerId: aiPlayer.id,
        cardId: sorted[0].id,
      };
    }

    if (game.pendingAction.type === 'defuse_place' && game.pendingAction.playerId === aiPlayer.id) {
      // Place near top to trap next player, but not position 0 (too obvious)
      const position = Math.min(1 + Math.floor(Math.random() * 3), game.deck.length);
      return {
        type: 'defuse_place',
        playerId: aiPlayer.id,
        position,
      };
    }

    if (game.pendingAction.type === 'see_future' && game.pendingAction.playerId === aiPlayer.id) {
      return {
        type: 'see_future_ack',
        playerId: aiPlayer.id,
      };
    }

    if (game.pendingAction.type === 'steal_target' && game.pendingAction.playerId === aiPlayer.id) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = targets.reduce((a, b) => a.hand.length > b.hand.length ? a : b);
        return {
          type: 'steal_target',
          playerId: aiPlayer.id,
          targetPlayerId: target.id,
        };
      }
    }

    if (game.pendingAction.type === 'three_of_kind_target' && game.pendingAction.playerId === aiPlayer.id) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = targets.reduce((a, b) => a.hand.length > b.hand.length ? a : b);
        return {
          type: 'three_of_kind_target',
          playerId: aiPlayer.id,
          targetPlayerId: target.id,
          targetCardType: 'defuse',
        };
      }
    }

    return null;
  }

  if (!isMyTurn) return null;

  // Strategic decisions
  const hasDefuse = hand.some(c => c.type === 'defuse');
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;
  const ekRemaining = alivePlayers - 1;
  const dangerLevel = deckSize > 0 ? ekRemaining / deckSize : 0;

  // If danger is high, play defensive cards
  if (dangerLevel > 0.25 || !hasDefuse) {
    // Try See the Future first to check
    const stf = hand.find(c => c.type === 'see_the_future');
    if (stf && dangerLevel > 0.15) {
      return { type: 'play_card', playerId: aiPlayer.id, cardId: stf.id };
    }

    // Shuffle if danger is high
    if (dangerLevel > 0.35) {
      const shuffleCard = hand.find(c => c.type === 'shuffle');
      if (shuffleCard) {
        return { type: 'play_card', playerId: aiPlayer.id, cardId: shuffleCard.id };
      }
    }

    // Attack to avoid drawing
    if (dangerLevel > 0.3 || (!hasDefuse && dangerLevel > 0.15)) {
      const attack = hand.find(c => c.type === 'attack');
      if (attack) {
        return { type: 'play_card', playerId: aiPlayer.id, cardId: attack.id };
      }
    }

    // Skip to avoid drawing
    if (dangerLevel > 0.2 || (!hasDefuse && dangerLevel > 0.1)) {
      const skip = hand.find(c => c.type === 'skip');
      if (skip) {
        return { type: 'play_card', playerId: aiPlayer.id, cardId: skip.id };
      }
    }
  }

  // Play pairs opportunistically
  const pairs = findPairs(hand);
  if (pairs.length > 0 && (Math.random() > 0.4 || hand.length > 6)) {
    const [c1, c2] = pairs[0];
    return {
      type: 'play_card',
      playerId: aiPlayer.id,
      cardId: c1.id,
      cardIds: [c1.id, c2.id],
    };
  }

  // Play Favor to get more cards
  if (hand.length < 5) {
    const favor = hand.find(c => c.type === 'favor');
    if (favor) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        return {
          type: 'play_card',
          playerId: aiPlayer.id,
          cardId: favor.id,
          targetPlayerId: target.id,
        };
      }
    }
  }

  // Default: draw
  return { type: 'draw', playerId: aiPlayer.id };
}

export async function processAITurn(game: GameState): Promise<{ game: GameState; actions: GameAction[] }> {
  let state = game;
  const actions: GameAction[] = [];

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer.isAI || !currentPlayer.isAlive) return { game: state, actions };

  // Small delay for UX
  await delay(600 + Math.random() * 500);

  // Process pending actions first
  if (state.pendingAction) {
    const pendingPlayer = state.players.find(p => p.id === state.pendingAction!.playerId);
    if (pendingPlayer?.isAI) {
      const action = getAIAction(state, pendingPlayer);
      if (action) {
        state = processAction(state, action);
        actions.push(action);
      }
    }
    return { game: state, actions };
  }

  // AI plays cards then draws
  let maxPlays = 3;
  while (maxPlays > 0 && state.status === 'playing') {
    const aiPlayer = state.players.find(p => p.id === currentPlayer.id)!;
    if (!aiPlayer.isAlive) break;
    if (state.players[state.currentPlayerIndex].id !== aiPlayer.id) break;
    if (state.pendingAction) break;

    const action = getAIAction(state, aiPlayer);
    if (!action || action.type === 'draw') {
      // Draw
      const drawAction: GameAction = { type: 'draw', playerId: aiPlayer.id };
      state = processAction(state, drawAction);
      actions.push(drawAction);

      // Handle defuse placement
      if (state.pendingAction?.type === 'defuse_place' && state.pendingAction.playerId === aiPlayer.id) {
        await delay(400);
        const updatedAI = state.players.find(p => p.id === aiPlayer.id)!;
        const defuseAction = getAIAction(state, updatedAI);
        if (defuseAction) {
          state = processAction(state, defuseAction);
          actions.push(defuseAction);
        }
      }
      break;
    } else {
      state = processAction(state, action);
      actions.push(action);
      await delay(300 + Math.random() * 200);

      // Handle pending from played card
      if (state.pendingAction && state.pendingAction.playerId === aiPlayer.id) {
        await delay(300);
        const updatedAI = state.players.find(p => p.id === aiPlayer.id)!;
        const pendingAction = getAIAction(state, updatedAI);
        if (pendingAction) {
          state = processAction(state, pendingAction);
          actions.push(pendingAction);
        }
      }
    }
    maxPlays--;
  }

  return { game: state, actions };
}
