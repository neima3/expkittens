'use client';

/**
 * Returns a stable, browser-local persistent player identity.
 * Generated once per device and stored in localStorage.
 * Used to key server-side stats across games, even if the player changes display name.
 */
const PERSISTENT_ID_KEY = 'ek_persistentId';

export function getPersistentId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(PERSISTENT_ID_KEY);
  if (!id) {
    // Generate a compact unique ID (similar format to nanoid)
    id = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(PERSISTENT_ID_KEY, id);
  }
  return id;
}
