import type { CardType } from '@/types/game';

export interface ExpansionPack {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cardSummary: string;
  color: string;
  /** Card types added to the deck by this pack */
  deckCards: { type: CardType; count: number }[];
  /** Special cards inserted directly (outside main deck, e.g. lethal cards) */
  specialCards?: { type: CardType; count: (playerCount: number) => number }[];
}

export const EXPANSION_PACKS: ExpansionPack[] = [
  {
    id: 'imploding_kittens',
    name: 'Imploding Kittens',
    emoji: '☢️',
    description:
      'Reverse direction, draw from the bottom, and survive (or implode) the Imploding Kitten.',
    cardSummary: 'Imploding Kitten, Reverse ×4, Draw from Bottom ×4, Feral Cat ×4',
    color: '#7B2FBE',
    deckCards: [
      { type: 'reverse', count: 4 },
      { type: 'draw_from_bottom', count: 4 },
      { type: 'feral_cat', count: 4 },
    ],
    specialCards: [{ type: 'imploding_kitten', count: () => 1 }],
  },
  {
    id: 'streaking_kittens',
    name: 'Streaking Kittens',
    emoji: '💨',
    description:
      'Hold a Streaking Kitten in your hand to automatically shield yourself from the next Exploding Kitten you draw — no Defuse needed.',
    cardSummary: 'Streaking Kitten ×4',
    color: '#f59e0b',
    deckCards: [{ type: 'streaking_kitten', count: 4 }],
  },
];

export const PACK_IDS = EXPANSION_PACKS.map(p => p.id);

export function getPackById(id: string): ExpansionPack | undefined {
  return EXPANSION_PACKS.find(p => p.id === id);
}

/** Normalize legacy expansionEnabled boolean to enabledPacks array.
 * When enabledPacks is explicitly provided (even empty), it takes priority.
 */
export function normalizePacks(
  enabledPacks?: string[],
  legacyExpansionEnabled?: boolean
): string[] {
  if (enabledPacks !== undefined) return enabledPacks;
  if (legacyExpansionEnabled) return ['imploding_kittens'];
  return [];
}
