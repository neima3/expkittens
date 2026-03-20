/**
 * Database migration script — run once at deploy time (not at request time).
 * Usage: npx tsx scripts/migrate.ts
 * Requires DATABASE_URL in environment (or .env.local via --env-file).
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('Running database migrations...');

  await sql`
    CREATE TABLE IF NOT EXISTS ek_games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      state JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ ek_games table');

  await sql`CREATE INDEX IF NOT EXISTS ek_games_code_idx ON ek_games(code)`;
  await sql`CREATE INDEX IF NOT EXISTS ek_games_updated_idx ON ek_games(updated_at)`;
  console.log('  ✓ ek_games indexes');

  await sql`
    CREATE TABLE IF NOT EXISTS ek_replay_shares (
      share_id TEXT PRIMARY KEY,
      game_state JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  console.log('  ✓ ek_replay_shares table');

  await sql`CREATE INDEX IF NOT EXISTS ek_replay_shares_expires_idx ON ek_replay_shares(expires_at)`;
  console.log('  ✓ ek_replay_shares indexes');

  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
