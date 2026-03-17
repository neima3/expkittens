import { NextRequest, NextResponse } from 'next/server';
import { getGameById, saveGame, initializeDatabase } from '@/lib/db';
import { getSpectatorView } from '@/lib/game-engine';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const body = await req.json();
    const { playerName, avatar = 0 } = body;

    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    const game = await getGameById(id);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    // Can spectate games that are playing or finished
    if (game.status === 'waiting') {
      return NextResponse.json({ error: 'Game has not started yet. Join as a player instead.' }, { status: 400 });
    }

    const spectatorId = `spec_${nanoid(10)}`;
    const spectators = game.spectators || [];

    if (spectators.length >= 20) {
      return NextResponse.json({ error: 'Spectator limit reached' }, { status: 400 });
    }

    spectators.push({
      id: spectatorId,
      name: playerName.trim().slice(0, 20),
      avatar,
      joinedAt: Date.now(),
    });

    game.spectators = spectators;
    game.lastActionId++;
    game.updatedAt = Date.now();

    await saveGame(game);

    return NextResponse.json({
      gameId: game.id,
      spectatorId,
      game: getSpectatorView(game),
    });
  } catch (error: unknown) {
    console.error('Spectate error:', error);
    return NextResponse.json({ error: 'Failed to join as spectator' }, { status: 500 });
  }
}
