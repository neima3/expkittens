'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '@/types/game';

/**
 * Adjusts pendingAction.expiresAt from server epoch to client epoch using the
 * serverNow timestamp included in the response. This corrects countdown drift
 * caused by client/server clock skew.
 */
function applyClockOffset(game: GameState, serverNow: number | undefined, receivedAt: number): GameState {
  if (!serverNow || !game.pendingAction?.expiresAt) return game;
  const clockOffset = receivedAt - serverNow;
  return {
    ...game,
    pendingAction: {
      ...game.pendingAction,
      expiresAt: game.pendingAction.expiresAt + clockOffset,
    },
  };
}

interface UseGameConnectionOptions {
  gameId: string;
  /** Current player's ID — empty string for spectators */
  playerId: string;
  /** Spectator ID — empty string for players */
  spectatorId: string;
  lastActionIdRef: MutableRefObject<number>;
  actionLoadingRef: MutableRefObject<boolean>;
  /** Called whenever SSE or poll delivers a new game state */
  onUpdate: (newGame: GameState, lastActionId: number) => void;
}

/**
 * Manages the SSE connection and polling for real-time game state updates.
 * Calls onUpdate whenever a new game state arrives.
 * Returns a poll() function for manual re-syncing.
 */
export function useGameConnection({
  gameId,
  playerId,
  spectatorId,
  lastActionIdRef,
  actionLoadingRef,
  onUpdate,
}: UseGameConnectionOptions): { poll: () => Promise<void> } {
  const esRef = useRef<EventSource | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  // Keep a stable ref so SSE/poll callbacks always see the latest onUpdate
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const poll = useCallback(async () => {
    if ((!playerId && !spectatorId) || actionLoadingRef.current) return;
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    try {
      const idParam = spectatorId ? `spectatorId=${spectatorId}` : `playerId=${playerId}`;
      const res = await fetch(
        `/api/games/${gameId}/poll?${idParam}&lastActionId=${lastActionIdRef.current}`,
        { signal: controller.signal }
      );
      const receivedAt = Date.now();
      const data = await res.json() as { changed?: boolean; game?: GameState; lastActionId?: number; serverNow?: number };
      if (!data.changed || !data.game) return;
      const game = applyClockOffset(data.game, data.serverNow, receivedAt);
      onUpdateRef.current(game, data.lastActionId ?? lastActionIdRef.current);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, [gameId, playerId, spectatorId, lastActionIdRef, actionLoadingRef]);

  useEffect(() => {
    if (!playerId && !spectatorId) return;

    const idParam = spectatorId ? `spectatorId=${spectatorId}` : `playerId=${playerId}`;

    function openSSE() {
      esRef.current?.close();
      const es = new EventSource(`/api/games/${gameId}/events?${idParam}`);
      esRef.current = es;

      es.onmessage = (ev) => {
        const receivedAt = Date.now();
        try {
          const data = JSON.parse(ev.data as string) as {
            game?: GameState;
            lastActionId?: number;
            serverNow?: number;
            error?: string;
          };
          if (!data.game) return;
          if (data.lastActionId !== undefined && data.lastActionId <= lastActionIdRef.current) return;
          const game = applyClockOffset(data.game, data.serverNow, receivedAt);
          onUpdateRef.current(game, data.lastActionId ?? lastActionIdRef.current);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        if (esRef.current === es) {
          esRef.current = null;
          setTimeout(openSSE, 3000);
        }
      };
    }

    openSSE();

    const onVisibility = () => {
      if (!document.hidden) {
        openSSE();
        void poll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [gameId, playerId, spectatorId, lastActionIdRef, poll]);

  // Clean up pending poll on unmount
  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  return { poll };
}
