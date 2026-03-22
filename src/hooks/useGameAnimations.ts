'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject, Dispatch, SetStateAction } from 'react';
import { sounds } from '@/lib/sounds';
import { launchExplosionParticles } from '@/lib/confetti';
import type { CardAction } from '@/components/game/CardActionAnimation';
import type { DrawAnimationState } from '@/components/game/DrawCardAnimation';

export interface UseGameAnimationsReturn {
  // Canvas refs (attach to <canvas> elements)
  confettiRef: RefObject<HTMLCanvasElement | null>;
  particleRef: RefObject<HTMLCanvasElement | null>;
  // Card action cinematic overlay
  cardAction: CardAction | null;
  setCardAction: (action: CardAction | null) => void;
  // Draw card animation
  drawAnimation: DrawAnimationState;
  setDrawAnimation: Dispatch<SetStateAction<DrawAnimationState>>;
  // Explosion overlay
  showExplosion: boolean;
  explodedPlayer: { name: string; avatar: number; isMe: boolean } | null;
  triggerExplosion: (player?: { name: string; avatar: number; isMe: boolean }) => void;
  // Pending explosion — shown after draw animation completes
  pendingExplosion: { name: string; avatar: number; isMe: boolean } | null;
  setPendingExplosion: (player: { name: string; avatar: number; isMe: boolean } | null) => void;
  // Card-play flash
  flashColor: string | null;
  triggerFlash: (color: string) => void;
  // Draw pile position for animated card travel
  deckElementPos: { x: number; y: number } | null;
  setDeckElementPos: (pos: { x: number; y: number } | null) => void;
}

/**
 * Manages all animation-related state: explosions, card actions, draw animation,
 * flash effects, and the canvas refs for confetti/particles.
 */
export function useGameAnimations(): UseGameAnimationsReturn {
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<HTMLCanvasElement>(null);
  const explosionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cardAction, setCardAction] = useState<CardAction | null>(null);
  const [drawAnimation, setDrawAnimation] = useState<DrawAnimationState>({
    isPlaying: false,
    phase: 'none',
    drawnCardType: null,
    hasDefuse: false,
    actorName: '',
  });
  const [showExplosion, setShowExplosion] = useState(false);
  const [explodedPlayer, setExplodedPlayer] = useState<{
    name: string;
    avatar: number;
    isMe: boolean;
  } | null>(null);
  const [pendingExplosion, setPendingExplosion] = useState<{
    name: string;
    avatar: number;
    isMe: boolean;
  } | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [deckElementPos, setDeckElementPos] = useState<{ x: number; y: number } | null>(null);

  const triggerExplosion = useCallback((diedPlayer?: { name: string; avatar: number; isMe: boolean }) => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setExplodedPlayer(diedPlayer || null);
    setShowExplosion(true);
    sounds?.explosion();
    if (!prefersReduced && particleRef.current) {
      launchExplosionParticles(particleRef.current, window.innerWidth / 2, window.innerHeight / 2);
    }
    if (!prefersReduced) {
      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 500);
    }
    if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current);
    explosionTimerRef.current = setTimeout(() => {
      setShowExplosion(false);
      setExplodedPlayer(null);
    }, 2800);
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashColor(null), 300);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (explosionTimerRef.current) clearTimeout(explosionTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  return {
    confettiRef,
    particleRef,
    cardAction,
    setCardAction,
    drawAnimation,
    setDrawAnimation,
    showExplosion,
    explodedPlayer,
    triggerExplosion,
    pendingExplosion,
    setPendingExplosion,
    flashColor,
    triggerFlash,
    deckElementPos,
    setDeckElementPos,
  };
}
