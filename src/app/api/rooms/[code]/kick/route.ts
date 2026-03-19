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
    const { playerId, targetPlayerId } = body;

    if (!playerId || !targetPlayerId) {
      return NextResponse.json({ error: 'playerId and targetPlayerId required' }, { status: 400 });
    }

    const room = await getRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId !== playerId) {
      return NextResponse.json({ error: 'Only the host can kick players' }, { status: 403 });
    }

    if (targetPlayerId === playerId) {
      return NextResponse.json({ error: 'Cannot kick yourself' }, { status: 400 });
    }

    const targetIdx = room.players.findIndex(p => p.id === targetPlayerId);
    if (targetIdx === -1) {
      return NextResponse.json({ error: 'Target player not in room' }, { status: 404 });
    }

    room.players.splice(targetIdx, 1);
    room.eventId += 1;
    room.updatedAt = Date.now();

    await updateRoom(room);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Kick player error:', error);
    return NextResponse.json({ error: 'Failed to kick player' }, { status: 500 });
  }
}
