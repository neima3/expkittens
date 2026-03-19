import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getGameById, saveReplayShare, initializeDatabase } from '@/lib/db';
import { getSpectatorView } from '@/lib/game-engine';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;

    const game = await getGameById(id);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (game.status !== 'finished') {
      return NextResponse.json({ error: 'Can only share completed games' }, { status: 400 });
    }

    const shareId = nanoid(10);
    // Store spectator view (no private hand info) for public sharing
    const spectatorView = getSpectatorView(game);
    await saveReplayShare(shareId, spectatorView);

    return NextResponse.json({ shareId });
  } catch (error: unknown) {
    console.error('Share replay error:', error);
    return NextResponse.json({ error: 'Failed to create replay share' }, { status: 500 });
  }
}
