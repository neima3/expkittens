import type { GameState, GameAction, CardType, Player, Card, AIDifficulty } from '@/types/game';
import { CAT_CARD_TYPES } from '@/types/game';
import { processAction, resolveNopeWindow } from './game-engine';

function isCatCard(type: CardType): boolean {
  return CAT_CARD_TYPES.includes(type);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDifficulty(player: Player): AIDifficulty {
  return player.difficulty || 'normal';
}

function getNextAliveIndex(game: GameState, currentPlayerId: string): number {
  const players = game.players;
  const currentIdx = players.findIndex(p => p.id === currentPlayerId);
  for (let i = 1; i < players.length; i++) {
    const idx = (currentIdx + i) % players.length;
    if (players[idx].isAlive) return idx;
  }
  return -1;
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

function findTriples(hand: Card[]): [Card, Card, Card][] {
  const triples: [Card, Card, Card][] = [];
  const byType: Record<string, Card[]> = {};
  for (const card of hand) {
    if (isCatCard(card.type)) {
      if (!byType[card.type]) byType[card.type] = [];
      byType[card.type].push(card);
    }
  }
  for (const type in byType) {
    const cards = byType[type];
    if (cards.length >= 3) {
      triples.push([cards[0], cards[1], cards[2]]);
    }
  }
  return triples;
}

// --- Difficulty-aware steal targeting ---

function scoreStealTarget(game: GameState, aiPlayer: Player, target: Player): number {
  const diff = getDifficulty(aiPlayer);
  let score = 0;
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;
  const dangerLevel = deckSize > 0 ? (alivePlayers - 1) / deckSize : 1;
  const aiHasDefuse = aiPlayer.hand.some(c => c.type === 'defuse');

  if (diff === 'easy') {
    // Easy: completely random targeting
    return Math.random() * 10;
  }

  // More cards = higher chance of stealing something useful
  score += target.hand.length * 2;

  // Target the next player in turn order
  const nextAliveIdx = getNextAliveIndex(game, aiPlayer.id);
  if (nextAliveIdx !== -1 && game.players[nextAliveIdx].id === target.id) {
    score += diff === 'ruthless' ? 8 : 5;
  }

  // If danger is high and target likely has a defuse
  if (dangerLevel > 0.3 && !aiHasDefuse && target.hand.length >= 4) {
    score += diff === 'ruthless' ? 12 : 8;
  }

  // Penalize targeting players who are already weak
  if (target.hand.length <= 2) {
    score -= diff === 'ruthless' ? 1 : 3;
  }

  // In heads-up, always target the only opponent
  if (alivePlayers === 2) {
    score += 10;
  }

  // Ruthless: prioritize targeting human players
  if (diff === 'ruthless' && !target.isAI) {
    score += 6;
  }

  // Randomization inversely proportional to difficulty
  const randomRange = diff === 'normal' ? 5 : diff === 'hard' ? 3 : 1;
  score += Math.random() * randomRange;

  return score;
}

function pickStealTarget(game: GameState, aiPlayer: Player, targets: Player[]): Player {
  if (targets.length === 1) return targets[0];
  return targets.reduce((best, t) => {
    const bestScore = scoreStealTarget(game, aiPlayer, best);
    const tScore = scoreStealTarget(game, aiPlayer, t);
    return tScore > bestScore ? t : best;
  });
}

// --- Difficulty-aware three-of-a-kind card selection ---

function pickThreeOfKindCardType(game: GameState, aiPlayer: Player, target: Player): CardType {
  const diff = getDifficulty(aiPlayer);
  const aiHasDefuse = aiPlayer.hand.some(c => c.type === 'defuse');
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;
  const dangerLevel = deckSize > 0 ? (alivePlayers - 1) / deckSize : 1;

  // Easy: pick a random action card type
  if (diff === 'easy') {
    const types: CardType[] = ['attack', 'skip', 'favor', 'shuffle', 'see_the_future', 'nope', 'defuse'];
    return types[Math.floor(Math.random() * types.length)];
  }

  const weights: [CardType, number][] = [];

  // Defuse priority scales with difficulty
  const defuseMultiplier = diff === 'ruthless' ? 1.5 : diff === 'hard' ? 1.0 : 0.6;
  if (!aiHasDefuse && dangerLevel > 0.15) {
    weights.push(['defuse', (20 + dangerLevel * 30) * defuseMultiplier]);
  } else if (!aiHasDefuse) {
    weights.push(['defuse', 10 * defuseMultiplier]);
  } else {
    if (alivePlayers <= 3 && target.hand.length >= 3) {
      weights.push(['defuse', 12 * defuseMultiplier]);
    } else {
      weights.push(['defuse', 3]);
    }
  }

  weights.push(['attack', dangerLevel > 0.25 ? 15 : 8]);
  const aiNopeCount = aiPlayer.hand.filter(c => c.type === 'nope').length;
  weights.push(['nope', aiNopeCount === 0 ? 12 : 5]);
  weights.push(['skip', dangerLevel > 0.2 ? 10 : 5]);
  weights.push(['see_the_future', dangerLevel > 0.2 ? 8 : 4]);
  weights.push(['shuffle', dangerLevel > 0.3 ? 7 : 3]);
  weights.push(['favor', 4]);

  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [cardType, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return cardType;
  }

  return weights[0][0];
}

// --- Difficulty-aware favor giving ---

function pickFavorCard(hand: Card[], diff: AIDifficulty): Card {
  if (diff === 'easy') {
    // Easy: gives a random card (might even give defuse)
    return hand[Math.floor(Math.random() * hand.length)];
  }

  // Normal+: never give defuse if possible, give least valuable
  const nonDefuse = hand.filter(c => c.type !== 'defuse');
  const cardsToChooseFrom = nonDefuse.length > 0 ? nonDefuse : hand;
  const sorted = [...cardsToChooseFrom].sort((a, b) => getCardPriority(a.type) - getCardPriority(b.type));
  return sorted[0];
}

// --- Difficulty-aware defuse placement ---

function pickDefusePosition(game: GameState, aiPlayer: Player): number {
  const diff = getDifficulty(aiPlayer);
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive);

  if (diff === 'easy') {
    // Easy: random placement in the deck
    return Math.floor(Math.random() * (deckSize + 1));
  }

  if (diff === 'normal') {
    // Normal: place in top half, somewhat random
    const maxPos = Math.min(Math.ceil(deckSize / 2), deckSize);
    return Math.floor(Math.random() * maxPos);
  }

  // Hard and Ruthless: strategic placement
  const nextIdx = getNextAliveIndex(game, aiPlayer.id);
  const nextPlayer = nextIdx !== -1 ? game.players[nextIdx] : null;

  if (diff === 'ruthless') {
    // Ruthless: always places near top to trap the next player
    if (alivePlayers.length <= 2) {
      return Math.min(Math.floor(Math.random() * 1), deckSize); // position 0
    }
    if (nextPlayer && !nextPlayer.isAI) {
      // Specifically target human players
      return Math.min(Math.floor(Math.random() * 2), deckSize);
    }
    return Math.min(Math.floor(Math.random() * 2), deckSize);
  }

  // Hard: existing strategic behavior
  if (alivePlayers.length <= 2) {
    return Math.min(Math.floor(Math.random() * 2), deckSize);
  } else if (nextPlayer && nextPlayer.hand.length <= 2) {
    return Math.min(1 + Math.floor(Math.random() * 2), deckSize);
  } else if (deckSize <= 4) {
    return Math.min(Math.floor(Math.random() * 2), deckSize);
  } else {
    return Math.min(1 + Math.floor(Math.random() * 4), deckSize);
  }
}

// --- Main AI action (difficulty-aware) ---

export function getAIAction(game: GameState, aiPlayer: Player): GameAction | null {
  if (!aiPlayer.isAlive) return null;
  const diff = getDifficulty(aiPlayer);

  const hand = aiPlayer.hand;
  const isMyTurn = game.players[game.currentPlayerIndex].id === aiPlayer.id;

  // Handle pending actions first
  if (game.pendingAction) {
    if (game.pendingAction.type === 'favor_give' && game.pendingAction.playerId === aiPlayer.id) {
      const card = pickFavorCard(hand, diff);
      return { type: 'favor_give', playerId: aiPlayer.id, cardId: card.id };
    }

    if (game.pendingAction.type === 'defuse_place' && game.pendingAction.playerId === aiPlayer.id) {
      const position = pickDefusePosition(game, aiPlayer);
      return { type: 'defuse_place', playerId: aiPlayer.id, position };
    }

    if (game.pendingAction.type === 'see_future' && game.pendingAction.playerId === aiPlayer.id) {
      return { type: 'see_future_ack', playerId: aiPlayer.id };
    }

    if (game.pendingAction.type === 'steal_target' && game.pendingAction.playerId === aiPlayer.id) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = pickStealTarget(game, aiPlayer, targets);
        return { type: 'steal_target', playerId: aiPlayer.id, targetPlayerId: target.id };
      }
    }

    if (game.pendingAction.type === 'three_of_kind_target' && game.pendingAction.playerId === aiPlayer.id) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = pickStealTarget(game, aiPlayer, targets);
        const targetCardType = pickThreeOfKindCardType(game, aiPlayer, target);
        return { type: 'three_of_kind_target', playerId: aiPlayer.id, targetPlayerId: target.id, targetCardType };
      }
    }

    return null;
  }

  if (!isMyTurn) return null;

  // Difficulty-specific turn strategy
  if (diff === 'easy') return getEasyAction(game, aiPlayer);
  if (diff === 'normal') return getNormalAction(game, aiPlayer);
  if (diff === 'ruthless') return getRuthlessAction(game, aiPlayer);
  return getHardAction(game, aiPlayer);
}

// --- Easy AI: random play, never targets human, simple decisions ---

function getEasyAction(game: GameState, aiPlayer: Player): GameAction {
  const hand = aiPlayer.hand;

  // Easy AI: 70% chance to just draw immediately
  if (Math.random() < 0.7) {
    return { type: 'draw', playerId: aiPlayer.id };
  }

  // Occasionally play a random non-defuse, non-nope card
  const playable = hand.filter(c => c.type !== 'defuse' && c.type !== 'nope' && c.type !== 'exploding_kitten');
  if (playable.length > 0) {
    const card = playable[Math.floor(Math.random() * playable.length)];

    // If it's a favor card, pick a random AI target (never targets human)
    if (card.type === 'favor') {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0 && p.isAI);
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        return { type: 'play_card', playerId: aiPlayer.id, cardId: card.id, targetPlayerId: target.id };
      }
      // No AI targets, just draw
      return { type: 'draw', playerId: aiPlayer.id };
    }

    // Cat cards: only play pairs, not single cats
    if (isCatCard(card.type)) {
      const pairs = findPairs(hand);
      if (pairs.length > 0 && Math.random() > 0.7) {
        const [c1, c2] = pairs[0];
        return { type: 'play_card', playerId: aiPlayer.id, cardId: c1.id, cardIds: [c1.id, c2.id] };
      }
      return { type: 'draw', playerId: aiPlayer.id };
    }

    return { type: 'play_card', playerId: aiPlayer.id, cardId: card.id };
  }

  return { type: 'draw', playerId: aiPlayer.id };
}

// --- Normal AI: basic strategy, occasional targeting ---

function getNormalAction(game: GameState, aiPlayer: Player): GameAction {
  const hand = aiPlayer.hand;
  const hasDefuse = hand.some(c => c.type === 'defuse');
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;
  const ekRemaining = alivePlayers - 1;
  const dangerLevel = deckSize > 0 ? ekRemaining / deckSize : 0;

  // Play defensive only when danger is clearly high or no defuse
  if (dangerLevel > 0.35 || (!hasDefuse && dangerLevel > 0.2)) {
    // Try Skip or Attack
    const skip = hand.find(c => c.type === 'skip');
    if (skip) return { type: 'play_card', playerId: aiPlayer.id, cardId: skip.id };

    const attack = hand.find(c => c.type === 'attack');
    if (attack) return { type: 'play_card', playerId: aiPlayer.id, cardId: attack.id };

    // Shuffle if very dangerous
    if (dangerLevel > 0.4) {
      const shuffleCard = hand.find(c => c.type === 'shuffle');
      if (shuffleCard) return { type: 'play_card', playerId: aiPlayer.id, cardId: shuffleCard.id };
    }
  }

  // Occasionally play See the Future
  const stf = hand.find(c => c.type === 'see_the_future');
  if (stf && dangerLevel > 0.2 && Math.random() > 0.5) {
    return { type: 'play_card', playerId: aiPlayer.id, cardId: stf.id };
  }

  // Play pairs sometimes
  const pairs = findPairs(hand);
  if (pairs.length > 0 && Math.random() > 0.6) {
    const [c1, c2] = pairs[0];
    return { type: 'play_card', playerId: aiPlayer.id, cardId: c1.id, cardIds: [c1.id, c2.id] };
  }

  // Play Favor occasionally
  if (hand.length < 4) {
    const favor = hand.find(c => c.type === 'favor');
    if (favor && Math.random() > 0.4) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        return { type: 'play_card', playerId: aiPlayer.id, cardId: favor.id, targetPlayerId: target.id };
      }
    }
  }

  return { type: 'draw', playerId: aiPlayer.id };
}

// --- Hard AI: optimal combos, strategic STF usage, bluff-aware (original behavior) ---

function getHardAction(game: GameState, aiPlayer: Player): GameAction {
  const hand = aiPlayer.hand;
  const hasDefuse = hand.some(c => c.type === 'defuse');
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;
  const ekRemaining = alivePlayers - 1;
  const dangerLevel = deckSize > 0 ? ekRemaining / deckSize : 0;

  // If danger is high, play defensive cards
  if (dangerLevel > 0.25 || !hasDefuse) {
    const stf = hand.find(c => c.type === 'see_the_future');
    if (stf && dangerLevel > 0.15) {
      return { type: 'play_card', playerId: aiPlayer.id, cardId: stf.id };
    }

    if (dangerLevel > 0.35) {
      const shuffleCard = hand.find(c => c.type === 'shuffle');
      if (shuffleCard) return { type: 'play_card', playerId: aiPlayer.id, cardId: shuffleCard.id };
    }

    if (dangerLevel > 0.3 || (!hasDefuse && dangerLevel > 0.15)) {
      const attack = hand.find(c => c.type === 'attack');
      if (attack) return { type: 'play_card', playerId: aiPlayer.id, cardId: attack.id };
    }

    if (dangerLevel > 0.2 || (!hasDefuse && dangerLevel > 0.1)) {
      const skip = hand.find(c => c.type === 'skip');
      if (skip) return { type: 'play_card', playerId: aiPlayer.id, cardId: skip.id };
    }
  }

  // Play pairs opportunistically
  const pairs = findPairs(hand);
  if (pairs.length > 0 && (Math.random() > 0.4 || hand.length > 6)) {
    const [c1, c2] = pairs[0];
    return { type: 'play_card', playerId: aiPlayer.id, cardId: c1.id, cardIds: [c1.id, c2.id] };
  }

  // Play Favor to get more cards
  if (hand.length < 5) {
    const favor = hand.find(c => c.type === 'favor');
    if (favor) {
      const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        return { type: 'play_card', playerId: aiPlayer.id, cardId: favor.id, targetPlayerId: target.id };
      }
    }
  }

  return { type: 'draw', playerId: aiPlayer.id };
}

// --- Ruthless AI: aggressive targeting, card counting, combo chaining ---

function getRuthlessAction(game: GameState, aiPlayer: Player): GameAction {
  const hand = aiPlayer.hand;
  const hasDefuse = hand.some(c => c.type === 'defuse');
  const deckSize = game.deck.length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;
  const ekRemaining = alivePlayers - 1;
  const dangerLevel = deckSize > 0 ? ekRemaining / deckSize : 0;

  // Card counting: track discard pile to estimate deck composition
  const discardedEKs = game.discardPile.filter(c => c.type === 'exploding_kitten').length;
  const realEKRemaining = Math.max(0, ekRemaining - discardedEKs);
  const trueDanger = deckSize > 0 ? realEKRemaining / deckSize : 0;

  // Ruthless always plays triples first (named steal is very powerful)
  const triples = findTriples(hand);
  if (triples.length > 0) {
    const [c1, c2, c3] = triples[0];
    return { type: 'play_card', playerId: aiPlayer.id, cardId: c1.id, cardIds: [c1.id, c2.id, c3.id] };
  }

  // Aggressive STF usage - always want info
  const stf = hand.find(c => c.type === 'see_the_future');
  if (stf && trueDanger > 0.1) {
    return { type: 'play_card', playerId: aiPlayer.id, cardId: stf.id };
  }

  // Always play defensively even at lower danger thresholds
  if (trueDanger > 0.15 || !hasDefuse) {
    if (trueDanger > 0.2) {
      const shuffleCard = hand.find(c => c.type === 'shuffle');
      if (shuffleCard) return { type: 'play_card', playerId: aiPlayer.id, cardId: shuffleCard.id };
    }

    // Chain attacks aggressively
    const attack = hand.find(c => c.type === 'attack');
    if (attack && (trueDanger > 0.15 || !hasDefuse)) {
      return { type: 'play_card', playerId: aiPlayer.id, cardId: attack.id };
    }

    const skip = hand.find(c => c.type === 'skip');
    if (skip && (trueDanger > 0.1 || !hasDefuse)) {
      return { type: 'play_card', playerId: aiPlayer.id, cardId: skip.id };
    }
  }

  // Aggressively play pairs to steal cards
  const pairs = findPairs(hand);
  if (pairs.length > 0 && (Math.random() > 0.2 || hand.length > 4)) {
    const [c1, c2] = pairs[0];
    return { type: 'play_card', playerId: aiPlayer.id, cardId: c1.id, cardIds: [c1.id, c2.id] };
  }

  // Aggressively play Favor targeting humans preferentially
  const favor = hand.find(c => c.type === 'favor');
  if (favor) {
    const targets = game.players.filter(p => p.isAlive && p.id !== aiPlayer.id && p.hand.length > 0);
    // Prefer human targets
    const humanTargets = targets.filter(t => !t.isAI);
    const preferredTargets = humanTargets.length > 0 ? humanTargets : targets;
    if (preferredTargets.length > 0) {
      const target = pickStealTarget(game, aiPlayer, preferredTargets);
      return { type: 'play_card', playerId: aiPlayer.id, cardId: favor.id, targetPlayerId: target.id };
    }
  }

  return { type: 'draw', playerId: aiPlayer.id };
}

// --- AI trash talk ---

const TRASH_TALK: Record<AIDifficulty, Record<string, string[]>> = {
  easy: {
    attack: ['Meow?', 'Did I do that right?', 'Oops?'],
    skip: ['Skipping... I think?', 'Pass! Maybe.', 'Meow!'],
    see_the_future: ['Oooh, shiny cards!', 'Pretty!', '*bats at deck*'],
    shuffle: ['Shuffly shuffly!', 'Meow!', 'I like mixing things!'],
    favor: ['Card please? Meow!', 'Can I have one? 🐾'],
    pair: ['Two of them! I think!', '*bats at both cards*', 'Meow meow!'],
    default: ['Meow?', 'Mrrrow!', 'Purr...', 'Meow!', '*confused kitten noises*'],
  },
  normal: {
    attack: ['Your turn now.', 'Have fun with that.', 'Next player\'s turn.'],
    skip: ['Not drawing today.', 'I\'ll pass.', 'Safe.'],
    see_the_future: ['Interesting...', 'Knowledge is power.', 'I see things.'],
    shuffle: ['Let\'s mix things up.', 'New deck order.', 'Fresh start.'],
    favor: ['Share the wealth.', 'I need that card.', 'Hand it over.'],
    pair: ['A steal!', 'Your cards look nice...', 'Mine now.'],
    default: ['Watching you.', 'Hmm.', 'Noted.', 'Calculated.'],
  },
  hard: {
    attack: ['Stack overflow your turn.', 'Calculated aggression.', 'I computed your downfall.', 'Threat vector: you.'],
    skip: ['Probability favors me.', 'Risk assessment: skip.', 'Not today.', 'I do not gamble.'],
    see_the_future: ['Running probability model...', 'I see everything 😎', 'Analysis complete.', 'Deck state: known.'],
    shuffle: ['Resetting the dataset.', 'Your knowledge is obsolete now.', 'New entropy injected.'],
    favor: ['Data acquisition complete.', 'Give me your best card.', 'Optimal extraction.'],
    pair: ['Checkmate.', 'Your cards are mine now.', 'Optimal extraction complete.'],
    default: ['Calculating...', 'As expected.', 'Optimal play.', 'Logically inevitable.', 'I see you.'],
  },
  ruthless: {
    attack: ['ATTACK ATTACK ATTACK', 'Nice try, human 😈', 'SUFFER.', 'Come at me.', 'Your turn. 😈'],
    skip: ['I do not draw. I conquer.', 'CHAOS.', 'No risk, only reward. 😈'],
    see_the_future: ['I see your doom 😈', 'Your fate is sealed.', '👀 I know everything.', 'Peeking into your soul.'],
    shuffle: ['DISORDER. CHAOS. MAYHEM.', 'How does it feel? 😈', 'Shuffling your suffering.', 'CHAOS REIGNS.'],
    favor: ['Mine now. 😈', 'Thanks for the donation.', 'YOINK.', 'What\'s yours is mine.'],
    pair: ['Nice donation. 😈', 'YOINK.', 'Your hand belongs to me.', 'Helpless. 😈'],
    default: ['Nice try, human 😈', 'CHAOS REIGNS.', '😈', 'You were never safe.', 'SUFFER.', 'I am inevitable.'],
  },
};

function pickTrashTalk(diff: AIDifficulty, key: string): string | null {
  const chance = diff === 'easy' ? 0.2 : diff === 'normal' ? 0.25 : diff === 'hard' ? 0.35 : 0.55;
  if (Math.random() > chance) return null;
  const pool = TRASH_TALK[diff][key] ?? TRASH_TALK[diff].default;
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Difficulty-aware turn delays ---

function getTurnDelay(diff: AIDifficulty): number {
  switch (diff) {
    case 'easy': return 1000 + Math.random() * 800; // slow thinking
    case 'normal': return 600 + Math.random() * 500;
    case 'hard': return 500 + Math.random() * 400;
    case 'ruthless': return 300 + Math.random() * 300; // snap decisions
  }
}

function getActionDelay(diff: AIDifficulty): number {
  switch (diff) {
    case 'easy': return 500 + Math.random() * 400;
    case 'normal': return 300 + Math.random() * 200;
    case 'hard': return 250 + Math.random() * 200;
    case 'ruthless': return 150 + Math.random() * 150;
  }
}

function getMaxPlays(diff: AIDifficulty): number {
  switch (diff) {
    case 'easy': return 1; // easy only plays one card before drawing
    case 'normal': return 2;
    case 'hard': return 3;
    case 'ruthless': return 4; // combo chains
  }
}

// --- Process AI turn with difficulty-aware timing ---

export async function processAITurn(game: GameState): Promise<{ game: GameState; actions: GameAction[] }> {
  let state = game;
  const actions: GameAction[] = [];

  // Process pending actions FIRST
  if (state.pendingAction) {
    const pendingPlayer = state.players.find(p => p.id === state.pendingAction!.playerId);
    if (pendingPlayer?.isAI) {
      const diff = getDifficulty(pendingPlayer);
      await delay(getActionDelay(diff));
      const action = getAIAction(state, pendingPlayer);
      if (action) {
        state = processAction(state, action);
        actions.push(action);
      }
    }
    return { game: state, actions };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer.isAI || !currentPlayer.isAlive) return { game: state, actions };

  const diff = getDifficulty(currentPlayer);
  await delay(getTurnDelay(diff));

  let maxPlays = getMaxPlays(diff);
  while (maxPlays > 0 && state.status === 'playing') {
    const aiPlayer = state.players.find(p => p.id === currentPlayer.id)!;
    if (!aiPlayer.isAlive) break;
    if (state.players[state.currentPlayerIndex].id !== aiPlayer.id) break;
    if (state.pendingAction) break;

    const action = getAIAction(state, aiPlayer);
    if (!action || action.type === 'draw') {
      const drawAction: GameAction = { type: 'draw', playerId: aiPlayer.id };
      state = processAction(state, drawAction);
      actions.push(drawAction);

      if (state.pendingAction?.type === 'defuse_place' && state.pendingAction.playerId === aiPlayer.id) {
        await delay(getActionDelay(diff));
        const updatedAI = state.players.find(p => p.id === aiPlayer.id)!;
        const defuseAction = getAIAction(state, updatedAI);
        if (defuseAction) {
          state = processAction(state, defuseAction);
          actions.push(defuseAction);
        }
      }
      break;
    } else {
      // Look up played card type before it's removed from hand
      let talkKey = 'default';
      if (action.type === 'play_card' && action.cardId) {
        const playedCard = aiPlayer.hand.find(c => c.id === action.cardId);
        if (playedCard) {
          if (playedCard.type === 'attack') talkKey = 'attack';
          else if (playedCard.type === 'skip') talkKey = 'skip';
          else if (playedCard.type === 'see_the_future') talkKey = 'see_the_future';
          else if (playedCard.type === 'shuffle') talkKey = 'shuffle';
          else if (playedCard.type === 'favor') talkKey = 'favor';
          else if (isCatCard(playedCard.type) && action.cardIds && action.cardIds.length >= 2) talkKey = 'pair';
        }
      }

      state = processAction(state, action);
      actions.push(action);

      // Inject trash talk after the action log
      const taunt = pickTrashTalk(diff, talkKey);
      if (taunt && action.type === 'play_card') {
        state.logs.push({
          message: taunt,
          timestamp: Date.now() + 1,
          playerId: aiPlayer.id,
          type: 'chat',
          playerName: aiPlayer.name,
        });
      }

      await delay(getActionDelay(diff));

      if (state.pendingAction && state.pendingAction.playerId === aiPlayer.id) {
        await delay(getActionDelay(diff));
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

// --- Difficulty-aware Nope chances ---

function getAINopeChance(cardPlayed: CardType, game: GameState, aiPlayer: Player): number {
  const diff = getDifficulty(aiPlayer);
  const hasDefuse = aiPlayer.hand.some(c => c.type === 'defuse');
  const nopeCount = aiPlayer.hand.filter(c => c.type === 'nope').length;
  const alivePlayers = game.players.filter(p => p.isAlive).length;

  // Easy: almost never nopes
  if (diff === 'easy') return 0.05;

  let chance = 0;
  switch (cardPlayed) {
    case 'attack': chance = hasDefuse ? 0.2 : 0.6; break;
    case 'favor': chance = 0.5; break;
    case 'skip': chance = 0.1; break;
    case 'shuffle': chance = 0.15; break;
    case 'see_the_future': chance = 0.05; break;
    default: chance = 0.15;
  }

  // Difficulty multipliers
  if (diff === 'normal') chance *= 0.7;
  if (diff === 'ruthless') chance *= 1.4;

  // Ruthless: always nope attacks if no defuse
  if (diff === 'ruthless' && cardPlayed === 'attack' && !hasDefuse) {
    chance = Math.min(0.9, chance + 0.3);
  }

  // Save nopes if we only have one and there are many players
  if (nopeCount <= 1 && alivePlayers > 2) {
    chance *= diff === 'ruthless' ? 0.7 : 0.5;
  }

  return Math.min(1, chance);
}

export async function processAINopeResponses(game: GameState): Promise<GameState> {
  let state = game;
  if (!state.pendingAction || state.pendingAction.type !== 'nope_window') return state;

  const cardPlayed = state.pendingAction.cardPlayed!;
  const sourcePlayerId = state.pendingAction.sourcePlayerId!;

  const aiWithNope = state.players.filter(p =>
    p.isAI && p.isAlive && p.id !== sourcePlayerId && p.hand.some(c => c.type === 'nope')
  );

  for (const aiPlayer of aiWithNope) {
    if (!state.pendingAction || state.pendingAction.type !== 'nope_window') break;

    const lastNoper = state.pendingAction.nopeChain?.[state.pendingAction.nopeChain.length - 1];
    if (lastNoper === aiPlayer.id) continue;

    const diff = getDifficulty(aiPlayer);
    await delay(200 + Math.random() * (diff === 'ruthless' ? 300 : 500));

    const chance = getAINopeChance(cardPlayed, state, aiPlayer);
    if (Math.random() < chance) {
      const nopeCard = aiPlayer.hand.find(c => c.type === 'nope');
      if (nopeCard) {
        const nopeAction: GameAction = { type: 'play_card', playerId: aiPlayer.id, cardId: nopeCard.id };
        state = processAction(state, nopeAction);

        if (state.pendingAction?.type === 'nope_window') {
          state = await processAINopeResponses(state);
        }
        return state;
      }
    } else {
      const passAction: GameAction = { type: 'nope_pass', playerId: aiPlayer.id };
      state = processAction(state, passAction);
    }
  }

  if (state.pendingAction?.type === 'nope_window') {
    const humanWithNope = state.players.filter(p =>
      !p.isAI && p.isAlive && p.id !== sourcePlayerId && p.hand.some(c => c.type === 'nope')
    );
    if (humanWithNope.length === 0) {
      state = resolveNopeWindow(state);
    }
  }

  return state;
}
