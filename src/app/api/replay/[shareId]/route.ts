import { NextRequest, NextResponse } from 'next/server';
import { getReplayShare } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;

    const replay = await getReplayShare(shareId);
    if (!replay) {
      return NextResponse.json({ error: 'Replay not found or has expired' }, { status: 404 });
    }

    return NextResponse.json({
      shareId: replay.shareId,
      gameState: replay.gameState,
      createdAt: replay.createdAt,
      expiresAt: replay.expiresAt,
    });
  } catch (error: unknown) {
    console.error('Load replay error:', error);
    return NextResponse.json({ error: 'Failed to load replay' }, { status: 500 });
  }
}
