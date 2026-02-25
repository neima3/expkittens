'use client';

import { useState, useEffect } from 'react';
import { sounds } from '@/lib/sounds';

export default function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ek_muted');
    if (saved === 'true') {
      setMuted(true);
      if (sounds) sounds.muted = true;
    }
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    if (sounds) sounds.muted = next;
    localStorage.setItem('ek_muted', String(next));
    if (!next && sounds) sounds.click();
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg bg-surface-light/80 border border-border flex items-center justify-center text-sm hover:border-accent transition-colors"
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
