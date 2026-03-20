/**
 * In-process pub/sub for game state changes.
 * Works in Next.js dev and single-process production (next start).
 * For multi-process deployments, extend with Redis pub/sub.
 */
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeToGame(gameId: string, listener: Listener): () => void {
  if (!listeners.has(gameId)) listeners.set(gameId, new Set());
  listeners.get(gameId)!.add(listener);
  return () => {
    const set = listeners.get(gameId);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) listeners.delete(gameId);
  };
}

export function emitGameUpdate(gameId: string): void {
  listeners.get(gameId)?.forEach(fn => fn());
}
