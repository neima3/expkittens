import { NextRequest, NextResponse } from 'next/server';
import { initializeRoomsTable, getRoom, updateRoom } from '@/lib/rooms-db';
import { saveGame } from '@/lib/db';
import { createGame, startGame } from '@/lib/game-engine';
import { nanoid } from 'nanoid';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initializeRoomsTable();
    const { code } = await params;
    const body = await req.json();
    const { playerId, expansionEnabled } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    const room = await getRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId !== playerId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
    }

    if (room.status !== 'waiting') {
      // Already started — return the existing game id
      return NextResponse.json({ gameId: room.gameId });
    }

    const readyPlayers = room.players.filter(p => p.isReady);
    if (readyPlayers.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 ready players to start' }, { status: 400 });
    }

    const host = room.players.find(p => p.id === room.hostId)!;

    // Create game with the host
    let game = createGame({
      hostId: host.id,
      hostName: host.name,
      hostAvatar: host.avatar,
      isMultiplayer: true,
      aiCount: 0,
      expansionEnabled: expansionEnabled === true,
    });

    // Add the remaining ready players (skip host, already in game)
    for (const rp of readyPlayers) {
      if (rp.id === host.id) continue;
      game.players.push({
        id: rp.id,
        name: rp.name,
        hand: [],
        isAlive: true,
        isAI: false,
        avatar: rp.avatar,
      });
    }

    // Generate unique player IDs mapping — we reuse room player IDs as game player IDs
    // so clients can use their stored room playerId to identify themselves in-game
    const gameCode = nanoid(6).toUpperCase();
    game = { ...game, code: gameCode };

    // Start the game (deal cards)
    game = startGame(game);

    await saveGame(game);

    // Update room to 'started'
    room.status = 'started';
    room.gameId = game.id;
    room.eventId += 1;
    room.updatedAt = Date.now();
    await updateRoom(room);

    return NextResponse.json({ gameId: game.id });
  } catch (error: unknown) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
