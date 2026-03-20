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
    INSERT INTO ek_games (id, code, state, updated_at)
    VALUES (${game.id}, ${game.code}, ${JSON.stringify(game)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      state = ${JSON.stringify(game)}::jsonb,
      updated_at = NOW()
  `;
}

export async function getGameById(id: string): Promise<GameState | null> {
  const sql = getDb();
  const rows = await sql`SELECT state FROM ek_games WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rows[0].state as GameState;
}

export async function getGameByCode(code: string): Promise<GameState | null> {
  const sql = getDb();
  const rows = await sql`SELECT state FROM ek_games WHERE code = ${code}`;
  if (rows.length === 0) return null;
  return rows[0].state as GameState;
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
  `;
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
