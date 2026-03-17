import { NextRequest, NextResponse } from 'next/server';
import { getGameById, saveGame, initializeDatabase } from '@/lib/db';
import { createGame, startGame } from '@/lib/game-engine';
import { nanoid } from 'nanoid';
import type { SeriesState } from '@/types/game';

const COUNTDOWN_MS = 5000; // 5 second countdown before rematch starts

function buildNextSeriesState(
  currentSeries: SeriesState,
  newPlayerIdMap: Record<string, string>,
): SeriesState {
  // The game engine already updated scores, history, and seriesWinnerId when the game finished.
  // Here we just remap player IDs for the new game and increment currentMatch.

  const playerNames: Record<string, string> = {};
  for (const [oldId, name] of Object.entries(currentSeries.playerNames)) {
    const newId = newPlayerIdMap[oldId] || oldId;
    playerNames[newId] = name;
  }

  // Remap seriesWinnerId to new player ID
  let seriesWinnerPlayerId = currentSeries.seriesWinnerId;
  if (seriesWinnerPlayerId && newPlayerIdMap[seriesWinnerPlayerId]) {
    seriesWinnerPlayerId = newPlayerIdMap[seriesWinnerPlayerId];
  }

  return {
    ...currentSeries,
    currentMatch: currentSeries.currentMatch + 1,
    playerNames,
    seriesWinnerId: seriesWinnerPlayerId,
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const body = await req.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'finished') {
      return NextResponse.json({ error: 'Game is not finished' }, { status: 400 });
    }

    if (!game.isMultiplayer) {
      return NextResponse.json({ error: 'Use standard rematch for single-player' }, { status: 400 });
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || player.isAI) {
      return NextResponse.json({ error: 'Player not in this game' }, { status: 403 });
    }

    // If rematch game already created, just return its ID
    if (game.rematchGameId) {
      return NextResponse.json({ rematchGameId: game.rematchGameId, status: 'ready' });
    }

    // Add this player's rematch request
    const requests = new Set(game.rematchRequests || []);
    requests.add(playerId);
    game.rematchRequests = Array.from(requests);
    game.lastActionId++;
    game.updatedAt = Date.now();

    // Check if all human players have requested rematch
    const humanPlayers = game.players.filter(p => !p.isAI);
    const allAccepted = humanPlayers.every(p => requests.has(p.id));

    if (allAccepted) {
      // Start countdown
      game.rematchCountdown = Date.now();
      await saveGame(game);

      // Create the new game immediately - players will redirect after countdown
      const hostPlayer = game.players.find(p => p.id === game.hostId) || humanPlayers[0];
      const newPlayerIdMap: Record<string, string> = {};

      // Create new game with host
      const newHostId = nanoid(12);
      newPlayerIdMap[hostPlayer.id] = newHostId;

      // Build series state for the next game if this game is part of a series
      let existingSeries: SeriesState | undefined;
      if (game.series) {
        existingSeries = buildNextSeriesState(game.series, newPlayerIdMap);
      }

      let newGame = createGame({
        hostId: newHostId,
        hostName: hostPlayer.name,
        hostAvatar: hostPlayer.avatar,
        isMultiplayer: true,
        existingSeries,
      });

      // Add other human players in original order
      for (const p of game.players) {
        if (p.id === hostPlayer.id || p.isAI) continue;
        const newId = nanoid(12);
        newPlayerIdMap[p.id] = newId;
        newGame.players.push({
          id: newId,
          name: p.name,
          hand: [],
          isAlive: true,
          isAI: false,
          avatar: p.avatar,
        });
      }

      // Remap series playerNames now that we have all new IDs
      if (newGame.series && game.series) {
        const playerNames: Record<string, string> = {};
        for (const [oldId, name] of Object.entries(game.series.playerNames)) {
          const newId = newPlayerIdMap[oldId] || oldId;
          playerNames[newId] = name;
        }
        newGame.series = { ...newGame.series, playerNames };
      }

      // Auto-start the new game
      newGame = startGame(newGame);
      await saveGame(newGame);

      // Link old game to new game
      game.rematchGameId = newGame.id;
      game.lastActionId++;
      await saveGame(game);

      return NextResponse.json({
        status: 'ready',
        rematchGameId: newGame.id,
        playerIdMap: newPlayerIdMap,
        countdownMs: COUNTDOWN_MS,
        series: newGame.series || null,
      });
    }

    // Not everyone accepted yet
    await saveGame(game);

    return NextResponse.json({
      status: 'waiting',
      rematchRequests: game.rematchRequests,
      totalPlayers: humanPlayers.length,
      accepted: game.rematchRequests.length,
    });
  } catch (error: unknown) {
    console.error('Rematch error:', error);
    return NextResponse.json({ error: 'Failed to process rematch' }, { status: 500 });
  }
}

// GET to check rematch status (used by polling)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;

    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.rematchGameId) {
      return NextResponse.json({
        status: 'ready',
        rematchGameId: game.rematchGameId,
        countdownMs: COUNTDOWN_MS,
        countdownStarted: game.rematchCountdown,
      });
    }

    const humanPlayers = game.players.filter(p => !p.isAI);

    return NextResponse.json({
      status: 'waiting',
      rematchRequests: game.rematchRequests || [],
      totalPlayers: humanPlayers.length,
      accepted: (game.rematchRequests || []).length,
    });
  } catch (error: unknown) {
    console.error('Rematch status error:', error);
    return NextResponse.json({ error: 'Failed to get rematch status' }, { status: 500 });
  }
}
