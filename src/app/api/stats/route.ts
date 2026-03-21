import { NextRequest, NextResponse } from 'next/server';
import { getPlayerStatsByName, upsertPlayerStats, getTopPlayerStats } from '@/lib/db';
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
    const body = await req.json() as {
      playerName?: string;
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

    const inc: PlayerStatsIncrement = {
      gamesPlayed: 1,
      wins: body.won ? 1 : 0,
      losses: body.won ? 0 : 1,
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
