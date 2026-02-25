'use client';

import { motion } from 'framer-motion';

interface DangerMeterProps {
  deckSize: number;
  alivePlayers: number;
}

export default function DangerMeter({ deckSize, alivePlayers }: DangerMeterProps) {
  const ekRemaining = Math.max(0, alivePlayers - 1);
  const danger = deckSize > 0 ? Math.min(1, ekRemaining / deckSize) : 0;
  const percent = Math.round(danger * 100);

  let color = '#44bb44';
  let label = 'Safe';
  if (danger > 0.5) { color = '#ff4444'; label = 'Extreme'; }
  else if (danger > 0.3) { color = '#ff8800'; label = 'High'; }
  else if (danger > 0.15) { color = '#ffbb33'; label = 'Medium'; }
  else if (danger > 0.05) { color = '#88cc44'; label = 'Low'; }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light/85 border border-border text-xs shadow-lg">
      <motion.div
        animate={danger > 0.3 ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="text-sm"
      >
        💣
      </motion.div>
      <div className="w-16 h-1.5 rounded-full bg-[#1b1530] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
      <span style={{ color }} className="font-bold min-w-[48px]">
        {label} {percent > 0 ? `${percent}%` : ''}
      </span>
    </div>
  );
}
