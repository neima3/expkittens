import { NextRequest, NextResponse } from 'next/server';
import { initializeRoomsTable, getRoom, updateRoom } from '@/lib/rooms-db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initializeRoomsTable();
    const { code } = await params;
    const body = await req.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    const room = await getRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not in room' }, { status: 403 });
    }

    // Host is always ready; other players toggle
    if (!player.isHost) {
      player.isReady = !player.isReady;
    }

    room.eventId += 1;
    room.updatedAt = Date.now();

    await updateRoom(room);

    return NextResponse.json({ isReady: player.isReady });
  } catch (error: unknown) {
    console.error('Ready toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle ready' }, { status: 500 });
  }
}
