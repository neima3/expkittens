import { NextRequest, NextResponse } from 'next/server';
import { getPlayerStatsByPid, getPlayerStatsByName, upsertPlayerStats, getTopPlayerStats, getGameById, recordStatSubmission, upsertLeaderboard } from '@/lib/db';
import type { PlayerStatsIncrement } from '@/lib/db';
import { statsLimiter } from '@/lib/rate-limit';

/** Returns the Monday of the current week as a YYYY-MM-DD string. */
function currentWeekStart(): string {
  const now = new Date();
  const diff = (now.getUTCDay() + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().split('T')[0];
}

export interface StatsResponse {
  playerStats: {
    playerName: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    kittensDrawn: number;
    defusesUsed: number;
    nopesPlayed: number;
    cardsPlayed: number;
  } | null;
  leaderboard: Array<{
    rank: number;
    playerName: string;
    wins: number;
    gamesPlayed: number;
    winRate: number;
  }>;
}

// GET /api/stats?playerId=xxx  — lookup by stable persistentId (preferred)
// GET /api/stats?playerName=xxx — legacy name-based lookup (fallback)
export async function GET(req: NextRequest) {
  try {
    const persistentId = req.nextUrl.searchParams.get('playerId')?.trim() || '';
    const playerName = req.nextUrl.searchParams.get('playerName')?.trim() || '';

    const [playerStats, topPlayers] = await Promise.all([
      persistentId
        ? getPlayerStatsByPid(persistentId)
        : playerName
          ? getPlayerStatsByName(playerName)
          : Promise.resolve(null),
      getTopPlayerStats(20),
    ]);

    const leaderboard = topPlayers.map((p, i) => ({
      rank: i + 1,
      playerName: p.playerName,
      wins: p.wins,
      gamesPlayed: p.gamesPlayed,
      winRate: p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0,
    }));

    return NextResponse.json({
      playerStats: playerStats
        ? {
            playerName: playerStats.playerName,
            gamesPlayed: playerStats.gamesPlayed,
            wins: playerStats.wins,
            losses: playerStats.losses,
            kittensDrawn: playerStats.kittensDrawn,
            defusesUsed: playerStats.defusesUsed,
            nopesPlayed: playerStats.nopesPlayed,
            cardsPlayed: playerStats.cardsPlayed,
          }
        : null,
      leaderboard,
    } satisfies StatsResponse);
  } catch (err) {
    console.error('Stats GET error:', err);
    return NextResponse.json({ playerStats: null, leaderboard: [] } satisfies StatsResponse);
  }
}

// POST /api/stats — record game result for a player
// Requires: gameId, playerId (in-game), persistentId (stable browser identity)
// persistentId is verified against the player record stored in game state at join time.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!statsLimiter.check(ip)) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json() as {
      persistentId?: string;
      gameId?: string;
      playerId?: string;
      kittensDrawn?: number;
      defusesUsed?: number;
      nopesPlayed?: number;
      cardsPlayed?: number;
    };

    const gameId = (body.gameId ?? '').trim();
    const playerId = (body.playerId ?? '').trim();
    const persistentId = (body.persistentId ?? '').trim();

    if (!gameId || !playerId) {
      return NextResponse.json({ ok: false, error: 'gameId and playerId required' }, { status: 400 });
    }

    // Verify game exists and is finished
    const game = await getGameById(gameId);
    if (!game) {
      return NextResponse.json({ ok: false, error: 'Game not found' }, { status: 404 });
    }
    if (game.status !== 'finished') {
      return NextResponse.json({ ok: false, error: 'Game not finished' }, { status: 400 });
    }

    // Verify the player actually participated (and is not an AI)
    const player = game.players.find(p => p.id === playerId && !p.isAI);
    if (!player) {
      return NextResponse.json({ ok: false, error: 'Player not found in game' }, { status: 403 });
    }

    // Verify persistentId against game state if it was recorded at join time.
    // If the game has a persistentId for this player, the submission MUST match.
    // Games without persistentId (old games or solo play) accept the submission
    // using the persistentId provided by the client (or fall back to playerId).
    if (player.persistentId && persistentId !== player.persistentId) {
      return NextResponse.json({ ok: false, error: 'Identity mismatch' }, { status: 403 });
    }

    // Stable identity key: prefer persistentId from game state, then from request, then fallback to in-game playerId
    const stableId = player.persistentId ?? (persistentId || `fallback_${playerId}`);

    // One-submission-per-game-per-player constraint
    const recorded = await recordStatSubmission(gameId, playerId);
    if (!recorded) {
      return NextResponse.json({ ok: false, error: 'Stats already recorded for this game' }, { status: 409 });
    }

    // Derive won from actual game result — never trust client-provided value
    const won = game.winnerId === playerId;

    // Get display name from verified game state, not from client
    const displayName = player.name;

    const inc: PlayerStatsIncrement = {
      gamesPlayed: 1,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      kittensDrawn: Math.max(0, body.kittensDrawn ?? 0),
      defusesUsed: Math.max(0, body.defusesUsed ?? 0),
      nopesPlayed: Math.max(0, body.nopesPlayed ?? 0),
      cardsPlayed: Math.max(0, body.cardsPlayed ?? 0),
    };

    await upsertPlayerStats(stableId, displayName, inc);

    // Update weekly leaderboard server-side (no separate client call needed)
    if (won) {
      await upsertLeaderboard(stableId, displayName, currentWeekStart());
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Stats POST error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
