import { NextRequest, NextResponse } from 'next/server';
import { getGameByIdWithVersion, saveGameOptimistic } from '@/lib/db';
import { processAction, resolveNopeWindow, getPlayerView } from '@/lib/game-engine';
import { processAITurn, processAINopeResponses } from '@/lib/ai';
import { emitGameUpdate } from '@/lib/game-events';
import type { GameAction } from '@/types/game';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { playerId, ...actionData } = body;

    const result = await getGameByIdWithVersion(id);
    if (!result) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    const { game, version } = result;
    if (game.status !== 'playing') return NextResponse.json({ error: 'Game not active' }, { status: 400 });

    const action: GameAction = {
      ...actionData,
      playerId,
    };

    let updatedGame = processAction(game, action);

    // If a nope window just opened, let AI players respond
    if (updatedGame.pendingAction?.type === 'nope_window') {
      updatedGame = await processAINopeResponses(updatedGame);
    }

    // Process AI turns and pending actions
    let maxIterations = 20;
    let aiProcessed = true;
    while (aiProcessed && updatedGame.status === 'playing' && maxIterations-- > 0) {
      const prevActionId = updatedGame.lastActionId;
      const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];

      if (updatedGame.pendingAction) {
        if (updatedGame.pendingAction.type === 'nope_window') {
          // Nope window is active — don't process AI turns, wait for resolution
          aiProcessed = false;
        } else {
          const pendingPlayer = updatedGame.players.find(p => p.id === updatedGame.pendingAction!.playerId);
          if (pendingPlayer?.isAI) {
            const result = await processAITurn(updatedGame);
            updatedGame = result.game;
            // Check for new nope window after AI turn
            if (updatedGame.pendingAction?.type === 'nope_window') {
              updatedGame = await processAINopeResponses(updatedGame);
            }
          } else {
            aiProcessed = false;
          }
        }
      } else if (currentPlayer.isAI && currentPlayer.isAlive) {
        const result = await processAITurn(updatedGame);
        updatedGame = result.game;
        // Check for new nope window after AI turn
        if (updatedGame.pendingAction?.type === 'nope_window') {
          updatedGame = await processAINopeResponses(updatedGame);
        }
      } else {
        aiProcessed = false;
      }

      if (updatedGame.lastActionId === prevActionId && aiProcessed) {
        break;
      }
    }

    const saved = await saveGameOptimistic(updatedGame, version);
    if (!saved) {
      return NextResponse.json({ error: 'Concurrent update detected, please retry' }, { status: 409 });
    }
    emitGameUpdate(id);

    return NextResponse.json({
      game: getPlayerView(updatedGame, playerId),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    console.error('Action error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
