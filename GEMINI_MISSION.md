# GEMINI MISSION — ExpKittens 10X UI Overhaul + Desktop Version

## Context
This is a Next.js 15 Exploding Kittens card game at ~/Desktop/Apps/expkittens.
Live at: https://expkittens.nak.im
Stack: Next.js 15, Tailwind CSS v4, Framer Motion, TypeScript

## Mission
You are a 10X developer. Make this app look STUNNING. Then create proper desktop/mobile responsive layouts.

## Part 1: Visual Overhaul (Both Views)
Make the UI look like a premium AAA card game. Think:
- Richer card designs with gradient backgrounds, inner glows, subtle textures
- More dramatic animations on card draw, play, and explosion
- Better visual hierarchy and spacing
- Add particle/glow effects on key interactions
- The home screen should feel like a game launcher — epic, moody, immersive
- Glass panels should have stronger depth — multiple light sources, rim lighting
- Font sizes, colors, contrast — make everything pop
- Add a subtle animated background on all screens (dark, moody, cat-themed)

## Part 2: Desktop Layout (NEW)
Create a dedicated desktop layout that shows MUCH MORE information at once.
Desktop = viewport width >= 1024px (lg breakpoint)

### Desktop Home Screen:
- Wide split layout: left panel = branding/hero, right panel = game controls
- Show full stats panel alongside create/join buttons
- Animated background with floating elements

### Desktop Game Screen:
- Use the full width! No more cramped mobile layout on desktop
- Opponents displayed in a row across the top with avatars and card counts
- Center area: large card table feel — draw pile + discard pile side by side, bigger
- Player hand at bottom: cards are bigger, spread out like a real hand (fan layout)
- Left sidebar: game log (real-time action feed)  
- Right sidebar: danger meter + stats + level progress
- Top bar: room code + player count + turn indicator — more spacious
- Use CSS Grid to create a proper game board layout on desktop

### Mobile Layout (keep & refine):
- Keep all existing mobile optimizations
- Improve the card hand display: cards should overlap/fan slightly
- Make the draw pile area bigger and more tappable

## Part 3: Screenshot Everything
Before AND after each major change, take screenshots using Playwright.
Save screenshots to: output/screenshots/
- output/screenshots/before-desktop-home.png
- output/screenshots/before-mobile-home.png  
- output/screenshots/after-desktop-home.png
- output/screenshots/after-mobile-home.png
- output/screenshots/after-desktop-game.png
- output/screenshots/after-mobile-game.png

## Playwright Setup
```javascript
const { chromium } = require('playwright');
// Desktop: { width: 1440, height: 900 }
// Mobile: { width: 390, height: 844, isMobile: true }
// App runs at: http://localhost:3000 (npm run dev)
```

## Technical Notes
- ALWAYS run `npm run build` to verify no TypeScript/build errors before finishing
- Mobile breakpoint: default (< 1024px)
- Desktop breakpoint: lg (>= 1024px)  
- Use Tailwind's responsive prefixes: `lg:` for desktop
- Framer Motion is available — use it for smooth desktop transitions
- Keep all existing functionality working
- The game API routes must remain unchanged
- globals.css has custom CSS variables — extend them, don't break them

## Definition of Done
1. Home screen looks EPIC on both desktop (1440px) and mobile (390px)
2. Game screen has a proper card-table desktop layout on large screens
3. Mobile game screen improved but backward compatible
4. All screenshots captured in output/screenshots/
5. `npm run build` passes with 0 errors
6. Test gameplay flow: create game → join as AI → draw card → verify no errors

## Start Here
1. First run `npm run dev` in background
2. Take "before" screenshots
3. Build the desktop CSS grid game layout
4. Improve the visual design everywhere
5. Take "after" screenshots
6. Run `npm run build`
7. Commit with message: "feat: desktop layout + 10X visual overhaul via Gemini"
