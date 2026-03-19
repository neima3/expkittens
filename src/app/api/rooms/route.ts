import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  initializeRoomsTable,
  createRoom,
  maybeCleanupOldRooms,
  type Room,
} from '@/lib/rooms-db';

export async function POST(req: NextRequest) {
  try {
    await initializeRoomsTable();
    void maybeCleanupOldRooms();

    const body = await req.json();
    const { playerName, avatar = 0, isPublic = false } = body;

    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const playerId = nanoid(12);
    const code = nanoid(6).toUpperCase();

    const room: Room = {
      code,
      hostId: playerId,
      status: 'waiting',
      isPublic: Boolean(isPublic),
      players: [
        {
          id: playerId,
          name: playerName.trim().slice(0, 20),
          avatar: Number(avatar) || 0,
          isReady: true, // host is auto-ready
          isHost: true,
        },
      ],
      eventId: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createRoom(room);

    return NextResponse.json({ code, playerId });
  } catch (error: unknown) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
