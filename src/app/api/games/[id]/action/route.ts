import { NextRequest, NextResponse } from 'next/server';
import { getGameById, saveGame, initializeDatabase } from '@/lib/db';
import { processAction, getPlayerView } from '@/lib/game-engine';
import { processAITurn } from '@/lib/ai';
import type { GameAction } from '@/types/game';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const body = await req.json();
    const { playerId, ...actionData } = body;

    const game = await getGameById(id);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (game.status !== 'playing') return NextResponse.json({ error: 'Game not active' }, { status: 400 });

    const action: GameAction = {
      ...actionData,
      playerId,
    };

    let updatedGame = processAction(game, action);

    // Process AI turns if it's an AI's turn
    let aiProcessed = true;
    while (aiProcessed && updatedGame.status === 'playing') {
      const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
      if (currentPlayer.isAI && currentPlayer.isAlive && !updatedGame.pendingAction) {
        const result = await processAITurn(updatedGame);
        updatedGame = result.game;
      } else if (updatedGame.pendingAction && updatedGame.pendingAction.playerId) {
        const pendingPlayer = updatedGame.players.find(p => p.id === updatedGame.pendingAction!.playerId);
        if (pendingPlayer?.isAI) {
          const result = await processAITurn(updatedGame);
          updatedGame = result.game;
        } else {
          aiProcessed = false;
        }
      } else {
        aiProcessed = false;
      }
    }

    await saveGame(updatedGame);

    return NextResponse.json({
      game: getPlayerView(updatedGame, playerId),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    console.error('Action error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
