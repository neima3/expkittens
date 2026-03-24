/**
 * Tests for the expansion pack rule engine (NEIA-306).
 *
 * Covers:
 * - Deck composition for each pack combination
 * - Streaking Kitten shield mechanic
 * - Imploding Kittens deck composition
 * - Backward compat: legacy expansionEnabled → enabledPacks
 */
import { describe, it, expect } from 'vitest';
import { createGame, startGame, processAction } from '../game-engine';
import { normalizePacks, getPackById, EXPANSION_PACKS } from '../expansion-packs';
import type { Card, CardType, GameState } from '../../types/game';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGame(enabledPacks: string[]): GameState {
  const base = createGame({
    hostId: 'p1',
    hostName: 'Alice',
    hostAvatar: 0,
    isMultiplayer: false,
    aiCount: 1,
    aiDifficulty: 'easy',
    enabledPacks,
  });
  return startGame(base);
}

function countCardType(cards: Card[], type: CardType): number {
  return cards.filter(c => c.type === type).length;
}

function allCards(game: GameState): Card[] {
  return [
    ...game.deck,
    ...game.discardPile,
    ...game.players.flatMap(p => p.hand),
  ];
}

// ---------------------------------------------------------------------------
// normalizePacks utility
// ---------------------------------------------------------------------------

describe('normalizePacks', () => {
  it('returns empty array when nothing enabled', () => {
    expect(normalizePacks()).toEqual([]);
    expect(normalizePacks([], false)).toEqual([]);
  });

  it('returns provided enabledPacks unchanged', () => {
    expect(normalizePacks(['imploding_kittens'])).toEqual(['imploding_kittens']);
    expect(normalizePacks(['streaking_kittens'])).toEqual(['streaking_kittens']);
    expect(normalizePacks(['imploding_kittens', 'streaking_kittens'])).toEqual([
      'imploding_kittens',
      'streaking_kittens',
    ]);
  });

  it('maps legacy expansionEnabled=true → imploding_kittens', () => {
    expect(normalizePacks(undefined, true)).toEqual(['imploding_kittens']);
  });

  it('ignores legacy flag when enabledPacks is explicitly provided', () => {
    // explicit empty overrides legacy true
    expect(normalizePacks([], true)).toEqual([]);
    // explicit pack list wins
    expect(normalizePacks(['streaking_kittens'], true)).toEqual(['streaking_kittens']);
  });
});

// ---------------------------------------------------------------------------
// getPackById
// ---------------------------------------------------------------------------

describe('getPackById', () => {
  it('returns pack for known IDs', () => {
    expect(getPackById('imploding_kittens')?.id).toBe('imploding_kittens');
    expect(getPackById('streaking_kittens')?.id).toBe('streaking_kittens');
  });

  it('returns undefined for unknown IDs', () => {
    expect(getPackById('nonexistent')).toBeUndefined();
  });

  it('all EXPANSION_PACKS are retrievable by id', () => {
    for (const pack of EXPANSION_PACKS) {
      expect(getPackById(pack.id)).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Deck composition — base (no packs)
// ---------------------------------------------------------------------------

describe('deck composition — base only', () => {
  it('contains no expansion cards', () => {
    const game = makeGame([]);
    const cards = allCards(game);
    expect(countCardType(cards, 'reverse')).toBe(0);
    expect(countCardType(cards, 'draw_from_bottom')).toBe(0);
    expect(countCardType(cards, 'feral_cat')).toBe(0);
    expect(countCardType(cards, 'imploding_kitten')).toBe(0);
    expect(countCardType(cards, 'streaking_kitten')).toBe(0);
  });

  it('contains correct base card counts', () => {
    const game = makeGame([]);
    const cards = allCards(game);
    expect(countCardType(cards, 'attack')).toBe(4);
    expect(countCardType(cards, 'skip')).toBe(4);
    expect(countCardType(cards, 'favor')).toBe(4);
    expect(countCardType(cards, 'shuffle')).toBe(4);
    expect(countCardType(cards, 'see_the_future')).toBe(5);
    expect(countCardType(cards, 'nope')).toBe(5);
  });

  it('contains (playerCount - 1) Exploding Kittens', () => {
    // 2 players (host + 1 AI) → 1 EK
    const game = makeGame([]);
    const cards = allCards(game);
    expect(countCardType(cards, 'exploding_kitten')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Deck composition — Imploding Kittens pack
// ---------------------------------------------------------------------------

describe('deck composition — imploding_kittens pack', () => {
  it('adds reverse, draw_from_bottom, feral_cat ×4 each', () => {
    const game = makeGame(['imploding_kittens']);
    const cards = allCards(game);
    expect(countCardType(cards, 'reverse')).toBe(4);
    expect(countCardType(cards, 'draw_from_bottom')).toBe(4);
    expect(countCardType(cards, 'feral_cat')).toBe(4);
  });

  it('adds exactly 1 Imploding Kitten', () => {
    const game = makeGame(['imploding_kittens']);
    const cards = allCards(game);
    expect(countCardType(cards, 'imploding_kitten')).toBe(1);
  });

  it('does not add streaking_kitten', () => {
    const game = makeGame(['imploding_kittens']);
    const cards = allCards(game);
    expect(countCardType(cards, 'streaking_kitten')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Deck composition — Streaking Kittens pack
// ---------------------------------------------------------------------------

describe('deck composition — streaking_kittens pack', () => {
  it('adds streaking_kitten ×4', () => {
    const game = makeGame(['streaking_kittens']);
    const cards = allCards(game);
    expect(countCardType(cards, 'streaking_kitten')).toBe(4);
  });

  it('does not add imploding_kitten, reverse, draw_from_bottom, feral_cat', () => {
    const game = makeGame(['streaking_kittens']);
    const cards = allCards(game);
    expect(countCardType(cards, 'imploding_kitten')).toBe(0);
    expect(countCardType(cards, 'reverse')).toBe(0);
    expect(countCardType(cards, 'draw_from_bottom')).toBe(0);
    expect(countCardType(cards, 'feral_cat')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Deck composition — both packs
// ---------------------------------------------------------------------------

describe('deck composition — both packs', () => {
  it('includes all expansion cards', () => {
    const game = makeGame(['imploding_kittens', 'streaking_kittens']);
    const cards = allCards(game);
    expect(countCardType(cards, 'reverse')).toBe(4);
    expect(countCardType(cards, 'draw_from_bottom')).toBe(4);
    expect(countCardType(cards, 'feral_cat')).toBe(4);
    expect(countCardType(cards, 'imploding_kitten')).toBe(1);
    expect(countCardType(cards, 'streaking_kitten')).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Streaking Kitten shield mechanic
// ---------------------------------------------------------------------------

describe('Streaking Kitten shield mechanic', () => {
  /** Build a minimal 2-player started game with a rigged deck */
  function gameWithRiggedDeck(
    p1Hand: Card[],
    deckCards: Card[]
  ): GameState {
    const base = createGame({
      hostId: 'p1',
      hostName: 'Alice',
      hostAvatar: 0,
      isMultiplayer: false,
      aiCount: 1,
      aiDifficulty: 'easy',
      enabledPacks: ['streaking_kittens'],
    });
    const started = startGame(base);

    // Overwrite player 0 hand and deck
    const players = started.players.map((p, i) =>
      i === 0 ? { ...p, hand: [...p1Hand] } : p
    );
    return { ...started, players, deck: [...deckCards], currentPlayerIndex: 0 };
  }

  function makeCard(type: CardType, id: string): Card {
    return { id, type };
  }

  it('shields player from exploding_kitten when holding streaking_kitten (no defuse)', () => {
    const sk = makeCard('streaking_kitten', 'sk1');
    const ek = makeCard('exploding_kitten', 'ek1');
    const otherCard = makeCard('skip', 's1');

    const game = gameWithRiggedDeck([sk, otherCard], [ek]);

    const result = processAction(game, { type: 'draw', playerId: 'p1' });

    // Player should still be alive
    const p1 = result.players.find(p => p.id === 'p1')!;
    expect(p1.isAlive).toBe(true);

    // Streaking Kitten should be spent (gone from hand)
    expect(p1.hand.some(c => c.type === 'streaking_kitten')).toBe(false);

    // EK should be back in deck (not on discard or hand)
    expect(result.deck.some(c => c.type === 'exploding_kitten')).toBe(true);
    expect(result.discardPile.some(c => c.type === 'exploding_kitten')).toBe(false);

    // A streaking_kitten discard entry should appear
    expect(result.discardPile.some(c => c.type === 'streaking_kitten')).toBe(true);

    // Log should mention shield
    expect(result.logs.some(l => l.message.includes('Streaking Kitten'))).toBe(true);
  });

  it('uses defuse instead of streaking_kitten when defuse is in hand', () => {
    const sk = makeCard('streaking_kitten', 'sk1');
    const defuse = makeCard('defuse', 'df1');
    const ek = makeCard('exploding_kitten', 'ek1');

    const game = gameWithRiggedDeck([sk, defuse], [ek]);

    const result = processAction(game, { type: 'draw', playerId: 'p1' });

    // Defuse triggers pending defuse_place
    expect(result.pendingAction?.type).toBe('defuse_place');

    // Streaking Kitten should still be in hand (defuse was used instead)
    const p1 = result.players.find(p => p.id === 'p1')!;
    expect(p1.hand.some(c => c.type === 'streaking_kitten')).toBe(true);
  });

  it('player explodes when no defuse and no streaking_kitten', () => {
    const skip = makeCard('skip', 's1');
    const ek = makeCard('exploding_kitten', 'ek1');

    const game = gameWithRiggedDeck([skip], [ek]);

    const result = processAction(game, { type: 'draw', playerId: 'p1' });

    const p1 = result.players.find(p => p.id === 'p1')!;
    expect(p1.isAlive).toBe(false);
    expect(result.logs.some(l => l.message.includes('EXPLODED'))).toBe(true);
  });

  it('does not trigger shield for non-EK cards', () => {
    const sk = makeCard('streaking_kitten', 'sk1');
    const skip = makeCard('skip', 's1');

    const game = gameWithRiggedDeck([sk], [skip]);

    const result = processAction(game, { type: 'draw', playerId: 'p1' });

    const p1 = result.players.find(p => p.id === 'p1')!;
    // Streaking Kitten should still be in hand (not spent)
    expect(p1.hand.some(c => c.type === 'streaking_kitten')).toBe(true);
    // Skip is in hand now
    expect(p1.hand.some(c => c.type === 'skip')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Legacy backward compat: expansionEnabled flag
// ---------------------------------------------------------------------------

describe('backward compat: expansionEnabled=true', () => {
  it('creates game with imploding_kittens pack when expansionEnabled=true', () => {
    const base = createGame({
      hostId: 'p1',
      hostName: 'Alice',
      hostAvatar: 0,
      isMultiplayer: false,
      aiCount: 1,
      expansionEnabled: true,
    });
    expect(base.enabledPacks).toContain('imploding_kittens');
    expect(base.expansionEnabled).toBe(true);
  });

  it('creates game with no packs when expansionEnabled=false', () => {
    const base = createGame({
      hostId: 'p1',
      hostName: 'Alice',
      hostAvatar: 0,
      isMultiplayer: false,
      aiCount: 1,
      expansionEnabled: false,
    });
    expect(base.enabledPacks).toEqual([]);
    expect(base.expansionEnabled).toBe(false);
  });

  it('started game has imploding_kittens in deck when expansionEnabled=true', () => {
    const base = createGame({
      hostId: 'p1',
      hostName: 'Alice',
      hostAvatar: 0,
      isMultiplayer: false,
      aiCount: 1,
      expansionEnabled: true,
    });
    const started = startGame(base);
    const cards = allCards(started);
    expect(countCardType(cards, 'imploding_kitten')).toBe(1);
    expect(countCardType(cards, 'reverse')).toBe(4);
  });
});
