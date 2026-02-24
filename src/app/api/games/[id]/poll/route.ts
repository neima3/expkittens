import { NextRequest, NextResponse } from 'next/server';
import { getGameById, initializeDatabase } from '@/lib/db';
import { getPlayerView } from '@/lib/game-engine';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const playerId = req.nextUrl.searchParams.get('playerId');
    const lastActionId = parseInt(req.nextUrl.searchParams.get('lastActionId') || '0');

    const game = await getGameById(id);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    // Only return full state if something changed
    if (game.lastActionId <= lastActionId) {
      return NextResponse.json({ changed: false, lastActionId: game.lastActionId });
    }

    return NextResponse.json({
      changed: true,
      game: playerId ? getPlayerView(game, playerId) : game,
      lastActionId: game.lastActionId,
    });
  } catch (error: unknown) {
    console.error('Poll error:', error);
    return NextResponse.json({ error: 'Failed to poll' }, { status: 500 });
  }
}
