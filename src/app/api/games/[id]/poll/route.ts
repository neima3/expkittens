import { NextRequest, NextResponse } from 'next/server';
import { getGameById, saveGame, initializeDatabase } from '@/lib/db';
import { getPlayerView, resolveNopeWindow } from '@/lib/game-engine';
import { processAITurn } from '@/lib/ai';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const playerId = req.nextUrl.searchParams.get('playerId');
    const lastActionId = parseInt(req.nextUrl.searchParams.get('lastActionId') || '0');

    const rawGame = await getGameById(id);
    if (!rawGame) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    let game = rawGame;

    // Auto-resolve expired nope windows
    if (game.pendingAction?.type === 'nope_window' && game.pendingAction.expiresAt && Date.now() >= game.pendingAction.expiresAt) {
      game = resolveNopeWindow(game);
      // Process AI turns after resolution
      if (game.status === 'playing') {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.isAI && currentPlayer.isAlive && !game.pendingAction) {
          const result = await processAITurn(game);
          game = result.game;
        } else if (game.pendingAction) {
          const pendingPlayer = game.players.find(p => p.id === game.pendingAction!.playerId);
          if (pendingPlayer?.isAI) {
            const result = await processAITurn(game);
            game = result.game;
          }
        }
      }
      await saveGame(game);
    }

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
