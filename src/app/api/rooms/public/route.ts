import { NextResponse } from 'next/server';
import { initializeRoomsTable, getPublicRooms } from '@/lib/rooms-db';

export async function GET() {
  try {
    await initializeRoomsTable();
    const rooms = await getPublicRooms();
    return NextResponse.json({ rooms });
  } catch (error: unknown) {
    console.error('Get public rooms error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}
