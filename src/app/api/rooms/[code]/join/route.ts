import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { initializeRoomsTable, getRoom, updateRoom } from '@/lib/rooms-db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initializeRoomsTable();
    const { code } = await params;
    const body = await req.json();
    const { playerName, avatar = 0 } = body;

    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const room = await getRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    if (room.players.length >= 5) {
      return NextResponse.json({ error: 'Room is full (max 5 players)' }, { status: 400 });
    }

    const playerId = nanoid(12);
    room.players.push({
      id: playerId,
      name: playerName.trim().slice(0, 20),
      avatar: Number(avatar) || 0,
      isReady: false,
      isHost: false,
    });
    room.eventId += 1;
    room.updatedAt = Date.now();

    await updateRoom(room);

    return NextResponse.json({ playerId, code: room.code });
  } catch (error: unknown) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
