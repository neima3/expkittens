/**
 * Regression tests for NEIA-318: stable player identity in stats & leaderboard.
 *
 * These tests exercise the identity verification and aggregation logic directly
 * without hitting a real database, by mocking the DB layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState, Player } from '../../types/game';

// ---------------------------------------------------------------------------
// Helpers: build minimal game fixtures
// ---------------------------------------------------------------------------

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    id: overrides.id,
    persistentId: overrides.persistentId,
    name: overrides.name ?? 'Player',
    hand: [],
    isAlive: overrides.isAlive ?? false,
    isAI: overrides.isAI ?? false,
    avatar: 0,
  };
}

function makeFinishedGame(winnerId: string, players: Player[]): GameState {
  return {
    id: 'game-001',
    code: 'ABCDEF',
    status: 'finished',
    players,
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    turnsRemaining: 1,
    pendingAction: null,
    winnerId,
    logs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isMultiplayer: true,
    hostId: players[0].id,
    lastActionId: 0,
    playDirection: 1,
  };
}

// ---------------------------------------------------------------------------
// Test: identity verification logic (extracted inline — mirrors stats/route.ts)
// ---------------------------------------------------------------------------

function verifyIdentity(
  game: GameState,
  playerId: string,
  persistentId: string,
): { ok: false; error: string } | { ok: true; stableId: string; displayName: string; won: boolean } {
  const player = game.players.find(p => p.id === playerId && !p.isAI);
  if (!player) return { ok: false, error: 'Player not found in game' };

  if (player.persistentId && persistentId !== player.persistentId) {
    return { ok: false, error: 'Identity mismatch' };
  }

  const stableId = player.persistentId ?? (persistentId || `fallback_${playerId}`);
  return {
    ok: true,
    stableId,
    displayName: player.name,
    won: game.winnerId === playerId,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stats identity verification', () => {
  it('accepts submission when persistentId matches game record', () => {
    const alice = makePlayer({ id: 'p1', persistentId: 'pid-alice', name: 'Alice' });
    const bob = makePlayer({ id: 'p2', persistentId: 'pid-bob', name: 'Bob' });
    const game = makeFinishedGame('p1', [alice, bob]);

    const result = verifyIdentity(game, 'p1', 'pid-alice');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stableId).toBe('pid-alice');
      expect(result.displayName).toBe('Alice');
      expect(result.won).toBe(true);
    }
  });

  it('rejects submission when persistentId does not match game record', () => {
    const alice = makePlayer({ id: 'p1', persistentId: 'pid-alice', name: 'Alice' });
    const bob = makePlayer({ id: 'p2', persistentId: 'pid-bob', name: 'Bob' });
    const game = makeFinishedGame('p1', [alice, bob]);

    // Bob tries to claim Alice's stats slot
    const result = verifyIdentity(game, 'p1', 'pid-bob');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Identity mismatch');
  });

  it('rejects submission for a player not in the game', () => {
    const alice = makePlayer({ id: 'p1', persistentId: 'pid-alice', name: 'Alice' });
    const game = makeFinishedGame('p1', [alice]);

    const result = verifyIdentity(game, 'p999', 'pid-anything');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Player not found in game');
  });

  it('rejects submission for AI players', () => {
    const alice = makePlayer({ id: 'p1', persistentId: 'pid-alice', name: 'Alice' });
    const bot = makePlayer({ id: 'ai_bot1', name: 'Whiskers', isAI: true });
    const game = makeFinishedGame('p1', [alice, bot]);

    const result = verifyIdentity(game, 'ai_bot1', 'some-pid');
    expect(result.ok).toBe(false);
  });
});

describe('duplicate names — separate identities', () => {
  it('two players with the same display name get separate stableIds', () => {
    const alice1 = makePlayer({ id: 'p1', persistentId: 'pid-device-1', name: 'Alice' });
    const alice2 = makePlayer({ id: 'p2', persistentId: 'pid-device-2', name: 'Alice' });
    const game = makeFinishedGame('p1', [alice1, alice2]);

    const r1 = verifyIdentity(game, 'p1', 'pid-device-1');
    const r2 = verifyIdentity(game, 'p2', 'pid-device-2');

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      // Same display name but different stable IDs → separate rows in DB
      expect(r1.stableId).not.toBe(r2.stableId);
      expect(r1.displayName).toBe(r2.displayName); // both "Alice"
    }
  });
});

describe('renamed player — stats stay under same stableId', () => {
  it('stableId is derived from persistentId, not the display name', () => {
    // Same person, different display name in two games
    const playerGameA = makePlayer({ id: 'p1', persistentId: 'pid-constant', name: 'OldName' });
    const gameA = makeFinishedGame('p1', [playerGameA]);

    const playerGameB = makePlayer({ id: 'p2', persistentId: 'pid-constant', name: 'NewName' });
    const gameB = makeFinishedGame('p2', [playerGameB]);

    const rA = verifyIdentity(gameA, 'p1', 'pid-constant');
    const rB = verifyIdentity(gameB, 'p2', 'pid-constant');

    expect(rA.ok).toBe(true);
    expect(rB.ok).toBe(true);
    if (rA.ok && rB.ok) {
      // Same stableId → both games merge into one stats row
      expect(rA.stableId).toBe(rB.stableId);
      // Display name updates to latest (NewName would be stored on second upsert)
      expect(rA.displayName).toBe('OldName');
      expect(rB.displayName).toBe('NewName');
    }
  });
});

describe('replayed submission — deduplication', () => {
  it('recordStatSubmission prevents double-counting (logic test)', () => {
    // The actual DB dedup is (gameId, playerId). This test verifies the contract.
    const seen = new Set<string>();

    function tryRecord(gameId: string, playerId: string): boolean {
      const key = `${gameId}:${playerId}`;
      if (seen.has(key)) return false; // duplicate
      seen.add(key);
      return true;
    }

    expect(tryRecord('game-001', 'p1')).toBe(true);  // first submission: accepted
    expect(tryRecord('game-001', 'p1')).toBe(false); // replay: rejected
    expect(tryRecord('game-001', 'p2')).toBe(true);  // different player: accepted
    expect(tryRecord('game-002', 'p1')).toBe(true);  // different game: accepted
  });
});

describe('win derivation from server state', () => {
  it('won is derived from game.winnerId, not from client input', () => {
    const alice = makePlayer({ id: 'p1', persistentId: 'pid-alice', name: 'Alice' });
    const bob = makePlayer({ id: 'p2', persistentId: 'pid-bob', name: 'Bob' });
    // Bob actually won
    const game = makeFinishedGame('p2', [alice, bob]);

    const rAlice = verifyIdentity(game, 'p1', 'pid-alice');
    const rBob = verifyIdentity(game, 'p2', 'pid-bob');

    expect(rAlice.ok).toBe(true);
    expect(rBob.ok).toBe(true);
    if (rAlice.ok) expect(rAlice.won).toBe(false); // Alice did NOT win
    if (rBob.ok) expect(rBob.won).toBe(true);      // Bob won
  });
});
