import { NextRequest, NextResponse } from 'next/server';
import { initializeRoomsTable, getRoom } from '@/lib/rooms-db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initializeRoomsTable();
    const { code } = await params;
    const lastEventId = parseInt(req.nextUrl.searchParams.get('lastEventId') || '0');

    const room = await getRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.eventId <= lastEventId) {
      return NextResponse.json({ changed: false, lastEventId: room.eventId });
    }

    return NextResponse.json({ changed: true, room, lastEventId: room.eventId });
  } catch (error: unknown) {
    console.error('Poll room error:', error);
    return NextResponse.json({ error: 'Failed to poll room' }, { status: 500 });
  }
}
