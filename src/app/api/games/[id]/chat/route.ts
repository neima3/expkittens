import { NextRequest, NextResponse } from 'next/server';
import { getGameById, saveGame } from '@/lib/db';
import { emitGameUpdate } from '@/lib/game-events';

const COOLDOWN_MS = 5000;
const MAX_MESSAGE_LENGTH = 100;
const MAX_LOGS = 200;

// Track last chat time per player (in-memory, resets on deploy)
const lastChatTime = new Map<string, number>();

const QUICK_PRESETS = [
  'GG', 'Well played', 'Good luck', 'Nice one!',
  'Nooo!', 'Oh no...', 'Wow', 'Hurry up!',
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { playerId, spectatorId, message, preset } = body as {
      playerId?: string;
      spectatorId?: string;
      message?: string;
      preset?: string;
    };

    if (!playerId && !spectatorId) {
      return NextResponse.json({ error: 'Missing playerId or spectatorId' }, { status: 400 });
    }

    const game = await getGameById(id);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    const isSpectator = !!spectatorId;
    let senderName: string;

    if (isSpectator) {
      const spectator = game.spectators?.find(s => s.id === spectatorId);
      if (!spectator) return NextResponse.json({ error: 'Spectator not in game' }, { status: 403 });
      senderName = spectator.name;
    } else {
      const player = game.players.find(p => p.id === playerId);
      if (!player) return NextResponse.json({ error: 'Player not in game' }, { status: 403 });
      senderName = player.name;
    }

    // Rate limiting
    const senderId = spectatorId || playerId!;
    const chatKey = `${id}:${senderId}`;
    const lastTime = lastChatTime.get(chatKey) || 0;
    const now = Date.now();
    if (now - lastTime < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
      return NextResponse.json({ error: `Wait ${remaining}s before sending another message` }, { status: 429 });
    }

    let chatMessage: string;
    let logType: 'chat' | 'preset' | 'spectator_chat';

    if (isSpectator) {
      // Spectators can only send presets or text, tagged as spectator_chat
      if (preset && QUICK_PRESETS.includes(preset)) {
        chatMessage = preset;
      } else if (message && typeof message === 'string') {
        chatMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);
        if (!chatMessage) {
          return NextResponse.json({ error: 'Empty message' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'No message or preset provided' }, { status: 400 });
      }
      logType = 'spectator_chat';
    } else if (preset && QUICK_PRESETS.includes(preset)) {
      chatMessage = preset;
      logType = 'preset';
    } else if (message && typeof message === 'string') {
      chatMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!chatMessage) {
        return NextResponse.json({ error: 'Empty message' }, { status: 400 });
      }
      logType = 'chat';
    } else {
      return NextResponse.json({ error: 'No message or preset provided' }, { status: 400 });
    }

    lastChatTime.set(chatKey, now);

    game.logs.push({
      message: chatMessage,
      timestamp: now,
      playerId: senderId,
      type: logType,
      playerName: senderName,
    });

    // Trim logs if too large
    if (game.logs.length > MAX_LOGS) {
      game.logs = game.logs.slice(-MAX_LOGS);
    }

    game.lastActionId++;
    game.updatedAt = now;

    await saveGame(game);
    emitGameUpdate(id);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    console.error('Chat error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
