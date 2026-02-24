import { NextRequest, NextResponse } from 'next/server';
import { createGame, startGame } from '@/lib/game-engine';
import { saveGame, initializeDatabase } from '@/lib/db';
import { processAITurn } from '@/lib/ai';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();

    const body = await req.json();
    const { playerName, avatar = 0, mode, aiCount = 1 } = body;

    if (!playerName || typeof playerName !== 'string') {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const playerId = nanoid(12);
    const isMultiplayer = mode === 'multiplayer';

    let game = createGame({
      hostId: playerId,
      hostName: playerName.slice(0, 20),
      hostAvatar: avatar,
      isMultiplayer,
      aiCount: isMultiplayer ? 0 : Math.min(Math.max(1, aiCount), 4),
    });

    if (!isMultiplayer) {
      // Start single-player game immediately
      game = startGame(game);
    }

    await saveGame(game);

    return NextResponse.json({
      gameId: game.id,
      playerId,
      code: game.code,
    });
  } catch (error: unknown) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
