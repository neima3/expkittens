# ExpKittens — Project Plan

## Overview
A web-based Exploding Kittens card game supporting 2-5 players (single-player vs AI or multiplayer via room codes). Players draw cards, play action cards, and try to avoid exploding kittens. Last player standing wins.

**Production URLs:** https://expkittens.nak.im / https://expkittens.nei.ma

## Architecture

### Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **Backend:** Next.js API routes (serverless functions on Vercel)
- **Database:** Neon PostgreSQL (serverless), JSONB game state storage
- **Audio:** Web Audio API synthesized sounds (no external audio files)
- **Deployment:** Vercel (auto-deploy from `main` branch)

### Key Files
| Area | Path |
|------|------|
| Game engine | `src/lib/game-engine.ts` |
| AI logic | `src/lib/ai.ts` |
| Database | `src/lib/db.ts` |
| Types | `src/types/game.ts` |
| Stats/XP | `src/lib/stats.ts` |
| Home page | `src/app/page.tsx` |
| Game page | `src/app/game/[id]/page.tsx` |
| API routes | `src/app/api/games/` |
| Components | `src/components/game/` |
| Styles | `src/app/globals.css` |

### Data Flow
1. Client creates game via `POST /api/games` → game state saved to Neon as JSONB
2. Client polls `GET /api/games/[id]/poll` with adaptive intervals (1.5s–8s)
3. Actions sent via `POST /api/games/[id]/action` → engine processes → AI turns auto-resolved → state saved
4. Client receives filtered view (`getPlayerView`) — opponent hands and deck hidden
5. Stats/XP stored in `localStorage` (client-only)

## Progress

### Completed (prior sessions)
- Core game engine with all card types (attack, skip, favor, shuffle, see_the_future, nope, pairs, triples)
- AI opponent with strategic decision-making
- Multiplayer lobby system with room codes
- Visual overhaul: Space Grotesk + Bungee fonts, glassmorphism, gradient CTAs
- Desktop layout (lg breakpoint): sidebar log, right panel stats, centered table
- XP/leveling system with 7 achievements and 6 rank tiers
- Safari/iOS compatibility (viewport-fit, prefixes, touch-action, safe areas)
- Mobile performance: adaptive polling, reduced particles, memo'd components, GPU hints
- Stale closure fixes, memory leak cleanup, AbortController for polls
- Sound effects (synthesized), confetti/explosion particles
- Keyboard shortcuts (D/P/L/?/Esc)

### Current session improvements
- [ ] Extract shared constants (AVATARS) to eliminate DRY violations
- [ ] Cache database initialization (avoid CREATE TABLE on every request)
- [ ] Fix dead code in game-engine.ts (`status: isMultiplayer ? 'waiting' : 'waiting'`)
- [ ] Fix accessibility: restore pinch-zoom capability
- [ ] Improve player name validation (reject whitespace-only)
- [ ] Smarter AI three-of-kind targeting (not always "defuse")
- [ ] Improve DangerMeter to account for player's defuse cards
- [ ] Add periodic stale game cleanup
- [ ] Fix OpponentBar label from abbreviated to full text
- [ ] Add nope card play validation (only when there's a pending action to cancel)

## TODOs (Future)
- Post-match progression summary card (XP gained, achievements unlocked)
- Party rematch vote flow for multiplayer
- Multiplayer chat/messaging
- Game replay system
- Leaderboard / online stats
- PWA offline support
- Action idempotency (prevent double-submit)
- Rate limiting on game creation
