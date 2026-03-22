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

  // Optimistic concurrency: version counter for safe concurrent mutations
  await sql`ALTER TABLE ek_games ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`;
  console.log('  ✓ ek_games.version column');

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

  await sql`
    CREATE TABLE IF NOT EXISTS ek_leaderboard (
      player_name TEXT NOT NULL,
      week_start DATE NOT NULL,
      wins INTEGER DEFAULT 1,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (player_name, week_start)
    )
  `;
  console.log('  ✓ ek_leaderboard table');

  await sql`CREATE INDEX IF NOT EXISTS ek_leaderboard_week_idx ON ek_leaderboard(week_start, wins DESC)`;
  console.log('  ✓ ek_leaderboard indexes');

  await sql`
    CREATE TABLE IF NOT EXISTS ek_player_stats (
      player_name TEXT PRIMARY KEY,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      kittens_drawn INTEGER DEFAULT 0,
      defuses_used INTEGER DEFAULT 0,
      nopes_played INTEGER DEFAULT 0,
      cards_played INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ ek_player_stats table');

  await sql`CREATE INDEX IF NOT EXISTS ek_player_stats_wins_idx ON ek_player_stats(wins DESC)`;
  console.log('  ✓ ek_player_stats indexes');

  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
