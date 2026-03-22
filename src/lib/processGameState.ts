import { toast } from 'sonner';
import type { GameState, Player } from '@/types/game';
import type { CardAction, CardActionType } from '@/components/game/CardActionAnimation';

function detectActionFromLog(message: string): { type: CardActionType; comboCount?: 2 | 3 } | null {
  if (message.includes('played Attack!') || message.includes('attack was Noped')) return { type: 'attack' };
  if (message.includes('played Skip!') || message.includes('skip was Noped')) return { type: 'skip' };
  if (message.includes('shuffled the deck!') || message.includes('shuffle was Noped')) return { type: 'shuffle' };
  if (message.includes('is seeing the future') || message.includes('see the future was Noped')) return { type: 'see_the_future' };
  if (message.includes('played Nope!') || message.includes('was Noped!')) return { type: 'nope' };
  if (message.includes('defused the Exploding Kitten')) return { type: 'defuse' };
  if (message.includes('asked') && message.includes('Favor')) return { type: 'favor' };
  if (message.includes('drew an Exploding Kitten')) return { type: 'exploding_kitten' };
  if (message.includes('played three')) return { type: 'cat_combo', comboCount: 3 };
  if (message.includes('played a pair')) return { type: 'cat_combo', comboCount: 2 };
  return null;
}

/**
 * Process state differences between oldGame and newGame:
 * - Toast new opponent log messages
 * - Trigger card action animations for opponent actions
 * - Notify about newly dead players
 */
export function processNewGameState(
  oldGame: GameState,
  newGame: GameState,
  playerId: string,
  onCardAction: (action: CardAction) => void,
  onPlayerDied: (player: { name: string; avatar: number; isMe: boolean }) => void,
): void {
  const newLogs = newGame.logs.slice(oldGame.logs.length);
  for (const log of newLogs) {
    if (log.playerId && log.playerId !== playerId) {
      toast(log.message, { duration: 2500 });
      const detected = detectActionFromLog(log.message);
      if (detected) {
        const actor = newGame.players.find((p: Player) => p.id === log.playerId);
        if (actor) {
          onCardAction({ type: detected.type, actorName: actor.name, comboCount: detected.comboCount });
        }
      }
    }
  }

  for (const p of newGame.players) {
    const oldP = oldGame.players.find((op: Player) => op.id === p.id);
    if (oldP?.isAlive && !p.isAlive) {
      onPlayerDied({ name: p.name, avatar: p.avatar, isMe: p.id === playerId });
    }
  }
}
