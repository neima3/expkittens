import { neon } from '@neondatabase/serverless';
import type { GameState } from '@/types/game';

export interface ReplayShare {
  shareId: string;
  gameState: GameState;
  createdAt: string;
  expiresAt: string;
}

// Lazy singleton — reused within a single serverless invocation, recreated across cold starts.
// Schema setup is handled by scripts/migrate.ts at deploy time, not at request time.
let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

export async function saveGame(game: GameState): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO ek_games (id, code, state, updated_at, version)
    VALUES (${game.id}, ${game.code}, ${JSON.stringify(game)}::jsonb, NOW(), 0)
    ON CONFLICT (id) DO UPDATE SET
      state = ${JSON.stringify(game)}::jsonb,
      updated_at = NOW(),
      version = ek_games.version + 1
  `;
}

/**
 * Conditionally save a game only if the stored version matches expectedVersion.
 * Returns true if the save succeeded, false if a concurrent update was detected.
 * Use this for any route that reads then mutates game state.
 */
export async function saveGameOptimistic(game: GameState, expectedVersion: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    UPDATE ek_games SET
      state = ${JSON.stringify(game)}::jsonb,
      updated_at = NOW(),
      version = version + 1
    WHERE id = ${game.id} AND version = ${expectedVersion}
    RETURNING id
  ` as Record<string, unknown>[];
  return rows.length > 0;
}

export async function getGameById(id: string): Promise<GameState | null> {
  const sql = getDb();
  const rows = await sql`SELECT state FROM ek_games WHERE id = ${id}` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rows[0].state as GameState;
}

export async function getGameByIdWithVersion(id: string): Promise<{ game: GameState; version: number } | null> {
  const sql = getDb();
  const rows = await sql`SELECT state, version FROM ek_games WHERE id = ${id}` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return { game: rows[0].state as GameState, version: rows[0].version as number };
}

export async function getGameByCode(code: string): Promise<GameState | null> {
  const sql = getDb();
  const rows = await sql`SELECT state FROM ek_games WHERE code = ${code}` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rows[0].state as GameState;
}

export async function getGameByCodeWithVersion(code: string): Promise<{ game: GameState; version: number } | null> {
  const sql = getDb();
  const rows = await sql`SELECT state, version FROM ek_games WHERE code = ${code}` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return { game: rows[0].state as GameState, version: rows[0].version as number };
}

export async function deleteOldGames(): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM ek_games WHERE updated_at < NOW() - INTERVAL '24 hours'`;
}

export async function saveReplayShare(shareId: string, gameState: GameState): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO ek_replay_shares (share_id, game_state, expires_at)
    VALUES (${shareId}, ${JSON.stringify(gameState)}::jsonb, NOW() + INTERVAL '7 days')
    ON CONFLICT (share_id) DO NOTHING
  `;
}

export async function getReplayShare(shareId: string): Promise<ReplayShare | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT share_id, game_state, created_at, expires_at
    FROM ek_replay_shares
    WHERE share_id = ${shareId} AND expires_at > NOW()
  ` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return {
    shareId: rows[0].share_id as string,
    gameState: rows[0].game_state as GameState,
    createdAt: rows[0].created_at as string,
    expiresAt: rows[0].expires_at as string,
  };
}

export async function deleteExpiredReplays(): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM ek_replay_shares WHERE expires_at < NOW()`;
}

export interface PlayerStats {
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  kittensDrawn: number;
  defusesUsed: number;
  nopesPlayed: number;
  cardsPlayed: number;
  updatedAt: string;
}

export interface PlayerStatsIncrement {
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  kittensDrawn?: number;
  defusesUsed?: number;
  nopesPlayed?: number;
  cardsPlayed?: number;
}

/**
 * Upsert player stats keyed by stable persistentId.
 * The display name is stored alongside but does NOT affect the row identity.
 * If the player renames, the next upsert updates player_name without splitting history.
 */
export async function upsertPlayerStats(persistentId: string, playerName: string, inc: PlayerStatsIncrement): Promise<void> {
  const sql = getDb();
  const gp = inc.gamesPlayed ?? 0;
  const w = inc.wins ?? 0;
  const l = inc.losses ?? 0;
  const kd = inc.kittensDrawn ?? 0;
  const du = inc.defusesUsed ?? 0;
  const np = inc.nopesPlayed ?? 0;
  const cp = inc.cardsPlayed ?? 0;
  await sql`
    INSERT INTO ek_player_stats (player_id, player_name, games_played, wins, losses, kittens_drawn, defuses_used, nopes_played, cards_played, updated_at)
    VALUES (${persistentId}, ${playerName}, ${gp}, ${w}, ${l}, ${kd}, ${du}, ${np}, ${cp}, NOW())
    ON CONFLICT (player_id) DO UPDATE SET
      player_name   = ${playerName},
      games_played  = ek_player_stats.games_played  + ${gp},
      wins          = ek_player_stats.wins          + ${w},
      losses        = ek_player_stats.losses        + ${l},
      kittens_drawn = ek_player_stats.kittens_drawn + ${kd},
      defuses_used  = ek_player_stats.defuses_used  + ${du},
      nopes_played  = ek_player_stats.nopes_played  + ${np},
      cards_played  = ek_player_stats.cards_played  + ${cp},
      updated_at    = NOW()
  `;
}

function rowToPlayerStats(r: Record<string, unknown>): PlayerStats {
  return {
    playerName: r.player_name as string,
    gamesPlayed: r.games_played as number,
    wins: r.wins as number,
    losses: r.losses as number,
    kittensDrawn: r.kittens_drawn as number,
    defusesUsed: r.defuses_used as number,
    nopesPlayed: r.nopes_played as number,
    cardsPlayed: r.cards_played as number,
    updatedAt: r.updated_at as string,
  };
}

/** Look up stats by stable persistentId. */
export async function getPlayerStatsByPid(persistentId: string): Promise<PlayerStats | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ek_player_stats WHERE player_id = ${persistentId}` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rowToPlayerStats(rows[0]);
}

/** Legacy lookup by display name (used for GET ?playerName= queries without persistentId). */
export async function getPlayerStatsByName(playerName: string): Promise<PlayerStats | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ek_player_stats WHERE player_name = ${playerName} ORDER BY wins DESC LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rowToPlayerStats(rows[0]);
}

export async function getTopPlayerStats(limit = 20): Promise<PlayerStats[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM ek_player_stats
    ORDER BY wins DESC, games_played DESC
    LIMIT ${limit}
  ` as Record<string, unknown>[];
  return rows.map(rowToPlayerStats);
}

/** Upsert weekly leaderboard keyed by stable persistentId. */
export async function upsertLeaderboard(persistentId: string, playerName: string, weekStart: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO ek_leaderboard (player_id, player_name, week_start, wins, updated_at)
    VALUES (${persistentId}, ${playerName}, ${weekStart}, 1, NOW())
    ON CONFLICT (player_id, week_start) DO UPDATE SET
      player_name = ${playerName},
      wins        = ek_leaderboard.wins + 1,
      updated_at  = NOW()
  `;
}

/**
 * Records a stat submission for a (gameId, playerId) pair.
 * Returns true if inserted (first submission), false if already exists (duplicate).
 */
export async function recordStatSubmission(gameId: string, playerId: string): Promise<boolean> {
  const sql = getDb();
  try {
    await sql`
      INSERT INTO ek_stat_submissions (game_id, player_id)
      VALUES (${gameId}, ${playerId})
    `;
    return true;
  } catch {
    // Duplicate primary key — submission already recorded
    return false;
  }
}

let lastCleanup = 0;
const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour

export async function maybeCleanupOldGames(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  try {
    await deleteOldGames();
  } catch {
    // Non-critical — swallow cleanup errors
  }
}
