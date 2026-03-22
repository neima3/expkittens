import { NextRequest } from 'next/server';
import { getGameById, saveGame } from '@/lib/db';
import { getPlayerView, getSpectatorView, resolveNopeWindow } from '@/lib/game-engine';
import { processAITurn } from '@/lib/ai';
import { subscribeToGame } from '@/lib/game-events';

// Disable response caching so SSE streams through
export const dynamic = 'force-dynamic';

// Allow longer-lived connections on Vercel Pro (ignored on free tier / other hosts)
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = req.nextUrl.searchParams.get('playerId');
  const spectatorId = req.nextUrl.searchParams.get('spectatorId');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      // Track the last action ID we sent so we only push on actual changes.
      // Initialise to -1 so the first fetch always sends the initial state.
      let lastSentActionId = -1;

      function send(data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      async function pushGameState() {
        if (closed) return;
        try {
          let game = await getGameById(id);
          if (!game) {
            send({ error: 'Game not found' });
            return;
          }

          // Auto-resolve expired nope windows (mirrors poll route logic)
          if (
            game.pendingAction?.type === 'nope_window' &&
            game.pendingAction.expiresAt &&
            Date.now() >= game.pendingAction.expiresAt
          ) {
            game = resolveNopeWindow(game);
            if (game.status === 'playing') {
              const currentPlayer = game.players[game.currentPlayerIndex];
              if (currentPlayer.isAI && currentPlayer.isAlive && !game.pendingAction) {
                const result = await processAITurn(game);
                game = result.game;
              } else if (game.pendingAction) {
                const pendingPlayerId = game.pendingAction?.playerId;
                const pendingPlayer = game.players.find(p => p.id === pendingPlayerId);
                if (pendingPlayer?.isAI) {
                  const result = await processAITurn(game);
                  game = result.game;
                }
              }
            }
            await saveGame(game);
          }

          // Skip if nothing has changed since the last push
          if (game.lastActionId === lastSentActionId) return;
          lastSentActionId = game.lastActionId;

          let viewGame;
          if (spectatorId) viewGame = getSpectatorView(game);
          else if (playerId) viewGame = getPlayerView(game, playerId);
          else viewGame = game;

          send({ game: viewGame, lastActionId: game.lastActionId, serverNow: Date.now() });
        } catch (err) {
          if (!closed) console.error('SSE push error:', err);
        }
      }

      // Send initial state immediately
      void pushGameState();

      // In-process subscription — fires instantly when all requests share a process
      // (Next.js dev mode, `next start` single instance).
      const unsubscribeInProcess = subscribeToGame(id, () => {
        void pushGameState();
      });

      // Database-polling fallback — the authoritative mechanism on serverless hosts
      // (Vercel, etc.) where each function invocation runs in its own process and
      // in-process pub/sub cannot cross instance boundaries.
      const dbPollInterval = setInterval(() => {
        void pushGameState();
      }, 1500);

      // Heartbeat comment every 20s to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 20_000);

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(dbPollInterval);
        clearInterval(heartbeat);
        unsubscribeInProcess();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
