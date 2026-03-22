import { NextRequest, NextResponse } from 'next/server';
import { getPlayerStatsByName, upsertPlayerStats, getTopPlayerStats, getGameById, recordStatSubmission } from '@/lib/db';
import type { PlayerStatsIncrement } from '@/lib/db';

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

// Simple in-memory rate limiter: tracks request timestamps per IP.
// Not perfect across serverless instances but provides baseline protection.
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => t > cutoff);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// GET /api/stats?playerName=xxx — returns player stats + all-time leaderboard
export async function GET(req: NextRequest) {
  try {
    const playerName = req.nextUrl.searchParams.get('playerName')?.trim() || '';

    const [playerStats, topPlayers] = await Promise.all([
      playerName ? getPlayerStatsByName(playerName) : Promise.resolve(null),
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
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json() as {
      playerName?: string;
      gameId?: string;
      playerId?: string;
      won?: boolean;
      kittensDrawn?: number;
      defusesUsed?: number;
      nopesPlayed?: number;
      cardsPlayed?: number;
    };

    const name = (body.playerName ?? '').trim().slice(0, 32);
    if (!name) {
      return NextResponse.json({ ok: false, error: 'playerName required' }, { status: 400 });
    }

    const gameId = (body.gameId ?? '').trim();
    const playerId = (body.playerId ?? '').trim();
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

    // One-submission-per-game-per-player constraint
    const recorded = await recordStatSubmission(gameId, playerId);
    if (!recorded) {
      return NextResponse.json({ ok: false, error: 'Stats already recorded for this game' }, { status: 409 });
    }

    // Derive won from actual game result — never trust client-provided value
    const won = game.winnerId === playerId;

    const inc: PlayerStatsIncrement = {
      gamesPlayed: 1,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      kittensDrawn: Math.max(0, body.kittensDrawn ?? 0),
      defusesUsed: Math.max(0, body.defusesUsed ?? 0),
      nopesPlayed: Math.max(0, body.nopesPlayed ?? 0),
      cardsPlayed: Math.max(0, body.cardsPlayed ?? 0),
    };

    await upsertPlayerStats(name, inc);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Stats POST error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
