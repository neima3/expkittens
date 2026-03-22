/**
 * Simple in-memory sliding-window rate limiter.
 * Not shared across serverless instances, but provides baseline protection.
 */

interface RateLimiter {
  check(key: string): boolean;
}

function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const map = new Map<string, number[]>();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;
      const timestamps = (map.get(key) ?? []).filter(t => t > cutoff);
      if (timestamps.length >= maxRequests) return false;
      timestamps.push(now);
      map.set(key, timestamps);
      return true;
    },
  };
}

// Action endpoint: 10 actions per second per player
export const actionLimiter = createRateLimiter(10, 1_000);

// Join endpoint: 5 joins per minute per IP
export const joinLimiter = createRateLimiter(5, 60_000);

// Stats submission: 2 per minute per IP
export const statsLimiter = createRateLimiter(2, 60_000);
