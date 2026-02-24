import { NextRequest, NextResponse } from 'next/server';
import { getGameByCode, saveGame, initializeDatabase } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();

    const body = await req.json();
    const { code, playerName, avatar = 0 } = body;

    if (!code || !playerName) {
      return NextResponse.json({ error: 'Code and player name required' }, { status: 400 });
    }

    const game = await getGameByCode(code.toUpperCase());
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    if (game.players.length >= 5) {
      return NextResponse.json({ error: 'Game is full (max 5 players)' }, { status: 400 });
    }

    const playerId = nanoid(12);
    game.players.push({
      id: playerId,
      name: playerName.slice(0, 20),
      hand: [],
      isAlive: true,
      isAI: false,
      avatar,
    });
    game.updatedAt = Date.now();
    game.lastActionId++;

    await saveGame(game);

    return NextResponse.json({
      gameId: game.id,
      playerId,
      code: game.code,
    });
  } catch (error: unknown) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
