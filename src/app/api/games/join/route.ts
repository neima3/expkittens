import { NextRequest, NextResponse } from 'next/server';
import { getGameByCodeWithVersion, saveGameOptimistic } from '@/lib/db';
import { nanoid } from 'nanoid';
import { joinLimiter } from '@/lib/rate-limit';

const MAX_JOIN_RETRIES = 5;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!joinLimiter.check(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const { code, playerName, avatar = 0 } = body;

    if (!code || !playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return NextResponse.json({ error: 'Code and player name required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();
    const playerId = nanoid(12);

    for (let attempt = 0; attempt < MAX_JOIN_RETRIES; attempt++) {
      const result = await getGameByCodeWithVersion(upperCode);
      if (!result) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }
      const { game, version } = result;

      if (game.status !== 'waiting') {
        return NextResponse.json({ error: 'Game already started' }, { status: 400 });
      }

      if (game.players.length >= 5) {
        return NextResponse.json({ error: 'Game is full (max 5 players)' }, { status: 400 });
      }

      game.players.push({
        id: playerId,
        name: playerName.trim().slice(0, 20),
        hand: [],
        isAlive: true,
        isAI: false,
        avatar,
      });
      game.updatedAt = Date.now();
      game.lastActionId++;

      const saved = await saveGameOptimistic(game, version);
      if (saved) {
        return NextResponse.json({
          gameId: game.id,
          playerId,
          code: game.code,
        });
      }
      // Concurrent update detected — retry with fresh state
    }

    return NextResponse.json({ error: 'Could not join game due to concurrent activity, please try again' }, { status: 409 });
  } catch (error: unknown) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
