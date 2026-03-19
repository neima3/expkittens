import { neon } from '@neondatabase/serverless';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: number;
  isReady: boolean;
  isHost: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  status: 'waiting' | 'started';
  isPublic: boolean;
  players: RoomPlayer[];
  gameId?: string;
  createdAt: number;
  updatedAt: number;
  eventId: number;
}

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

let roomsInitialized = false;

export async function initializeRoomsTable(): Promise<void> {
  if (roomsInitialized) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS ek_rooms (
      code TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      is_public BOOLEAN NOT NULL DEFAULT false,
      players JSONB NOT NULL DEFAULT '[]'::jsonb,
      game_id TEXT,
      event_id INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS ek_rooms_status_idx ON ek_rooms(status, is_public)`;
  await sql`CREATE INDEX IF NOT EXISTS ek_rooms_updated_idx ON ek_rooms(updated_at)`;
  roomsInitialized = true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRoom(r: any): Room {
  return {
    code: r.code,
    hostId: r.host_id,
    status: r.status as 'waiting' | 'started',
    isPublic: r.is_public,
    players: r.players as RoomPlayer[],
    gameId: r.game_id ?? undefined,
    eventId: Number(r.event_id),
    createdAt: Number(r.created_at_ms),
    updatedAt: Number(r.updated_at_ms),
  };
}

export async function createRoom(room: Room): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO ek_rooms (code, host_id, status, is_public, players, game_id, event_id)
    VALUES (
      ${room.code},
      ${room.hostId},
      ${room.status},
      ${room.isPublic},
      ${JSON.stringify(room.players)}::jsonb,
      ${room.gameId ?? null},
      ${room.eventId}
    )
  `;
}

export async function getRoom(code: string): Promise<Room | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT code, host_id, status, is_public, players, game_id, event_id,
           EXTRACT(EPOCH FROM created_at)::bigint * 1000 as created_at_ms,
           EXTRACT(EPOCH FROM updated_at)::bigint * 1000 as updated_at_ms
    FROM ek_rooms WHERE code = ${code}
  `;
  if (rows.length === 0) return null;
  return rowToRoom(rows[0]);
}

export async function updateRoom(room: Room): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE ek_rooms SET
      host_id = ${room.hostId},
      status = ${room.status},
      is_public = ${room.isPublic},
      players = ${JSON.stringify(room.players)}::jsonb,
      game_id = ${room.gameId ?? null},
      event_id = ${room.eventId},
      updated_at = NOW()
    WHERE code = ${room.code}
  `;
}

export async function getPublicRooms(): Promise<Room[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT code, host_id, status, is_public, players, game_id, event_id,
           EXTRACT(EPOCH FROM created_at)::bigint * 1000 as created_at_ms,
           EXTRACT(EPOCH FROM updated_at)::bigint * 1000 as updated_at_ms
    FROM ek_rooms
    WHERE is_public = true AND status = 'waiting'
      AND updated_at > NOW() - INTERVAL '30 minutes'
      AND jsonb_array_length(players) < 5
    ORDER BY created_at DESC
    LIMIT 20
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(rowToRoom);
}

export async function deleteOldRooms(): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM ek_rooms
    WHERE updated_at < NOW() - INTERVAL '30 minutes' AND status = 'waiting'
  `;
  await sql`
    DELETE FROM ek_rooms
    WHERE updated_at < NOW() - INTERVAL '2 hours' AND status = 'started'
  `;
}

let lastRoomCleanup = 0;
const ROOM_CLEANUP_INTERVAL = 1000 * 60 * 30;

export async function maybeCleanupOldRooms(): Promise<void> {
  const now = Date.now();
  if (now - lastRoomCleanup < ROOM_CLEANUP_INTERVAL) return;
  lastRoomCleanup = now;
  try {
    await deleteOldRooms();
  } catch {
    // Non-critical
  }
}
