import { NextRequest, NextResponse } from 'next/server';
import { getGameById, saveGame, initializeDatabase } from '@/lib/db';
import { getPlayerView, startGame } from '@/lib/game-engine';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const playerId = req.nextUrl.searchParams.get('playerId');

    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (playerId) {
      return NextResponse.json({ game: getPlayerView(game, playerId) });
    }

    return NextResponse.json({ game });
  } catch (error: unknown) {
    console.error('Get game error:', error);
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const body = await req.json();
    const { action, playerId } = body;

    if (action === 'start') {
      const game = await getGameById(id);
      if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      if (game.hostId !== playerId) return NextResponse.json({ error: 'Only host can start' }, { status: 403 });
      if (game.players.length < 2) return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 });

      const started = startGame(game);
      await saveGame(started);
      return NextResponse.json({ game: getPlayerView(started, playerId) });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Game action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
