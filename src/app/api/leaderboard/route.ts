import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

/** Returns the Monday of the current week as a YYYY-MM-DD string. */
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().split('T')[0];
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  wins: number;
}

// GET /api/leaderboard — returns top 25 for current week
export async function GET() {
  try {
    const sql = getDb();
    const weekStart = currentWeekStart();
    const rows = await sql`
      SELECT player_name, wins
      FROM ek_leaderboard
      WHERE week_start = ${weekStart}
      ORDER BY wins DESC
      LIMIT 25
    `;
    const entries: LeaderboardEntry[] = rows.map((row, i) => ({
      rank: i + 1,
      playerName: row.player_name as string,
      wins: row.wins as number,
    }));
    return NextResponse.json({ weekStart, entries });
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json({ weekStart: currentWeekStart(), entries: [] });
  }
}
// NOTE: Leaderboard writes are now handled server-side in POST /api/stats after
// verifying the player's identity against the finished game state.
// The previous unauthenticated POST endpoint has been removed to prevent
// arbitrary name injection and leaderboard manipulation.
