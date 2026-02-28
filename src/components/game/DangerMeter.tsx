'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

interface DangerMeterProps {
  deckSize: number;
  alivePlayers: number;
}

export default memo(function DangerMeter({ deckSize, alivePlayers }: DangerMeterProps) {
  const ekRemaining = Math.max(0, alivePlayers - 1);
  const danger = deckSize > 0 ? Math.min(1, ekRemaining / deckSize) : 0;
  const percent = Math.round(danger * 100);

  let color = '#2bd47c'; // success
  let glow = 'rgba(43,212,124,0)';
  let label = 'Safe';
  let pulse = false;

  if (danger > 0.5) { 
    color = '#ff3355'; // danger
    glow = 'rgba(255,51,85,0.6)';
    label = 'Extreme'; 
    pulse = true;
  }
  else if (danger > 0.3) { 
    color = '#ff5f2e'; // accent
    glow = 'rgba(255,95,46,0.4)';
    label = 'High'; 
  }
  else if (danger > 0.15) { 
    color = '#ffb833'; // warning
    glow = 'rgba(255,184,51,0.2)';
    label = 'Medium'; 
  }

  return (
    <div 
      className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/10 text-xs shadow-lg backdrop-blur-md bg-[#130f25]/80 transition-shadow duration-500"
      style={{ boxShadow: danger > 0.5 ? `0 0 20px ${glow}, inset 0 1px 1px rgba(255,255,255,0.1)` : `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)` }}
    >
      <motion.div
        animate={danger > 0.3 ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: danger > 0.5 ? 0.4 : 0.8, repeat: Infinity, ease: "easeInOut" }}
        className="text-base drop-shadow-md"
      >
        💣
      </motion.div>
      <div className="flex flex-col gap-1 w-16">
        <div className="flex justify-between items-center leading-none">
          <span style={{ color }} className="font-black text-[9px] uppercase tracking-widest drop-shadow-sm">
            {label}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-black/60 overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
          <motion.div
            className="h-full rounded-full"
            style={{ 
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 8px ${color}`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
      </div>
      <span className="font-black text-white/90 min-w-[28px] text-right text-[10px] tracking-wider">
        {percent}%
      </span>
    </div>
  );
})
