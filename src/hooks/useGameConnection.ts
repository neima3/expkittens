'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '@/types/game';

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
      const data = await res.json();
      if (!data.changed || !data.game) return;
      onUpdateRef.current(data.game, data.lastActionId ?? lastActionIdRef.current);
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
        try {
          const data = JSON.parse(ev.data as string) as {
            game?: GameState;
            lastActionId?: number;
            error?: string;
          };
          if (!data.game) return;
          if (data.lastActionId !== undefined && data.lastActionId <= lastActionIdRef.current) return;
          onUpdateRef.current(data.game, data.lastActionId ?? lastActionIdRef.current);
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
