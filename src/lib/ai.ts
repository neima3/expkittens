import type { GameState, GameAction, CardType, Player, Card } from '@/types/game';
import { CAT_CARD_TYPES } from '@/types/game';

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
      // Give the least valuable card (never give defuse)
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
      // Place exploding kitten near the top to trap next player
      const position = Math.min(2, game.deck.length);
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
        // Target player with most cards
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
  const ekCount = game.players.filter(p => !p.isAlive).length < game.players.length - 1
    ? game.players.length - 1 - game.players.filter(p => !p.isAlive).length
    : 0;
  const dangerLevel = deckSize > 0 ? ekCount / deckSize : 0;

  // If danger is high, play defensive cards
  if (dangerLevel > 0.3 || !hasDefuse) {
    // Try to play See the Future to check if safe
    const stf = hand.find(c => c.type === 'see_the_future');
    if (stf) {
      return { type: 'play_card', playerId: aiPlayer.id, cardId: stf.id };
    }

    // Play Shuffle if danger is high
    if (dangerLevel > 0.4) {
      const shuffleCard = hand.find(c => c.type === 'shuffle');
      if (shuffleCard) {
        return { type: 'play_card', playerId: aiPlayer.id, cardId: shuffleCard.id };
      }
    }

    // Play Attack to avoid drawing
    if (dangerLevel > 0.3) {
      const attack = hand.find(c => c.type === 'attack');
      if (attack) {
        return { type: 'play_card', playerId: aiPlayer.id, cardId: attack.id };
      }
    }

    // Play Skip to avoid drawing
    if (dangerLevel > 0.25) {
      const skip = hand.find(c => c.type === 'skip');
      if (skip) {
        return { type: 'play_card', playerId: aiPlayer.id, cardId: skip.id };
      }
    }
  }

  // Check for pairs to play
  const pairs = findPairs(hand);
  if (pairs.length > 0 && Math.random() > 0.5) {
    const [c1, c2] = pairs[0];
    return {
      type: 'play_card',
      playerId: aiPlayer.id,
      cardId: c1.id,
      cardIds: [c1.id, c2.id],
    };
  }

  // Play Favor if we have few cards
  if (hand.length < 4) {
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

  // Default: draw a card
  return { type: 'draw', playerId: aiPlayer.id };
}

export async function processAITurn(game: GameState): Promise<{ game: GameState; actions: GameAction[] }> {
  let state = game;
  const actions: GameAction[] = [];

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer.isAI || !currentPlayer.isAlive) return { game: state, actions };

  // Give AI a small thinking delay for UX
  await delay(800 + Math.random() * 700);

  // Process pending actions first
  if (state.pendingAction) {
    const action = getAIAction(state, currentPlayer);
    if (action) {
      const { processAction } = await import('./game-engine');
      state = processAction(state, action);
      actions.push(action);
    }
    return { game: state, actions };
  }

  // AI can play multiple cards before drawing
  let cardPlayed = true;
  let maxPlays = 3; // prevent infinite loops
  while (cardPlayed && maxPlays > 0 && state.status === 'playing') {
    const aiPlayer = state.players.find(p => p.id === currentPlayer.id)!;
    if (state.players[state.currentPlayerIndex].id !== aiPlayer.id) break;
    if (state.pendingAction) break;

    const action = getAIAction(state, aiPlayer);
    if (!action || action.type === 'draw') {
      // Draw card
      const drawAction: GameAction = { type: 'draw', playerId: aiPlayer.id };
      const { processAction } = await import('./game-engine');
      state = processAction(state, drawAction);
      actions.push(drawAction);
      cardPlayed = false;

      // Handle defuse placement if needed
      if (state.pendingAction?.type === 'defuse_place' && state.pendingAction.playerId === aiPlayer.id) {
        await delay(500);
        const defuseAction = getAIAction(state, state.players.find(p => p.id === aiPlayer.id)!);
        if (defuseAction) {
          state = processAction(state, defuseAction);
          actions.push(defuseAction);
        }
      }
    } else {
      const { processAction } = await import('./game-engine');
      state = processAction(state, action);
      actions.push(action);
      await delay(400 + Math.random() * 300);

      // Handle any pending from the played card
      if (state.pendingAction && state.pendingAction.playerId === aiPlayer.id) {
        await delay(400);
        const pendingAction = getAIAction(state, state.players.find(p => p.id === aiPlayer.id)!);
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
