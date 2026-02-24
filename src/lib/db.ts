import { neon } from '@neondatabase/serverless';
import type { GameState } from '@/types/game';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export async function initializeDatabase() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS ek_games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      state JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS ek_games_code_idx ON ek_games(code)`;
  await sql`CREATE INDEX IF NOT EXISTS ek_games_updated_idx ON ek_games(updated_at)`;
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
  // Delete games older than 24 hours
  await sql`DELETE FROM ek_games WHERE updated_at < NOW() - INTERVAL '24 hours'`;
}
