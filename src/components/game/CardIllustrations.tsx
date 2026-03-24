'use client';

import type { CardType } from '@/types/game';

interface CardIllustrationProps {
  type: CardType;
  className?: string;
}

const ExplodingKittenSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="ekGrad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ff6b4a" />
        <stop offset="50%" stopColor="#ff3322" />
        <stop offset="100%" stopColor="#8b0000" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Background burst */}
    <circle cx="60" cy="60" r="45" fill="url(#ekGrad)" opacity="0.3" />
    {/* Explosion rays */}
    {[...Array(8)].map((_, i) => (
      <line
        key={i}
        x1="60"
        y1="60"
        x2={60 + 55 * Math.cos((i * Math.PI) / 4)}
        y2={60 + 55 * Math.sin((i * Math.PI) / 4)}
        stroke="#ff5544"
        strokeWidth="4"
        opacity="0.6"
        filter="url(#glow)"
      />
    ))}
    {/* Kitten body */}
    <ellipse cx="60" cy="85" rx="25" ry="30" fill="#ffaa88" />
    {/* Ears */}
    <path d="M40 65 L45 45 L55 60 Z" fill="#ff9977" />
    <path d="M80 65 L75 45 L65 60 Z" fill="#ff9977" />
    {/* Face - angry */}
    <ellipse cx="52" cy="78" rx="5" ry="7" fill="#fff" />
    <ellipse cx="68" cy="78" rx="5" ry="7" fill="#fff" />
    <circle cx="52" cy="80" r="3" fill="#000" />
    <circle cx="68" cy="80" r="3" fill="#000" />
    {/* Angry eyebrows */}
    <path d="M45 70 L55 75" stroke="#000" strokeWidth="2" />
    <path d="M75 70 L65 75" stroke="#000" strokeWidth="2" />
    {/* Whiskers */}
    <path d="M35 85 L25 82 M35 88 L25 88 M35 91 L25 94" stroke="#000" strokeWidth="1" opacity="0.5" />
    <path d="M85 85 L95 82 M85 88 L95 88 M85 91 L95 94" stroke="#000" strokeWidth="1" opacity="0.5" />
    {/* Fuse */}
    <path d="M60 55 Q65 40 70 35 Q75 30 78 25" stroke="#ffaa00" strokeWidth="3" fill="none" />
    <circle cx="78" cy="25" r="4" fill="#ffff00" filter="url(#glow)" />
    {/* Spark particles */}
    <circle cx="82" cy="20" r="2" fill="#ffff88" />
    <circle cx="75" cy="18" r="1.5" fill="#ffff88" />
    <circle cx="85" cy="28" r="1.5" fill="#ffff88" />
    {/* Bomb body */}
    <circle cx="45" cy="45" r="15" fill="#333" />
    <path d="M40 35 L50 35 L48 40 L42 40 Z" fill="#555" />
    <text x="60" y="140" textAnchor="middle" fill="#ff5544" fontSize="14" fontWeight="bold" filter="url(#glow)">BOOM!</text>
  </svg>
);

const DefuseSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="defGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#44ff88" />
        <stop offset="100%" stopColor="#22aa44" />
      </linearGradient>
      <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#888" />
        <stop offset="50%" stopColor="#ccc" />
        <stop offset="100%" stopColor="#666" />
      </linearGradient>
    </defs>
    {/* Shield background */}
    <path d="M60 20 Q90 30 90 60 Q90 100 60 120 Q30 100 30 60 Q30 30 60 20" fill="url(#defGrad)" opacity="0.2" />
    {/* Pliers/Snips */}
    <g transform="translate(60, 70) rotate(-15)">
      {/* Handle 1 */}
      <rect x="-4" y="30" width="8" height="50" rx="4" fill="#ff4444" />
      {/* Handle 2 */}
      <rect x="-4" y="30" width="8" height="50" rx="4" fill="#4444ff" transform="rotate(30)" />
      {/* Pivot */}
      <circle cx="0" cy="25" r="8" fill="#silver" />
      {/* Metal arms */}
      <path d="M-3 25 L-8 -20 L-2 -25" stroke="url(#metalGrad)" strokeWidth="4" fill="none" />
      <path d="M3 25 L8 -20 L2 -25" stroke="url(#metalGrad)" strokeWidth="4" fill="none" />
      {/* Cutting jaws */}
      <path d="M-8 -20 L-15 -35 L-5 -30 Z" fill="#666" />
      <path d="M8 -20 L15 -35 L5 -30 Z" fill="#666" />
    </g>
    {/* Safe kitten */}
    <ellipse cx="35" cy="100" rx="15" ry="18" fill="#ffccaa" />
    <circle cx="30" cy="95" r="4" fill="#fff" />
    <circle cx="40" cy="95" r="4" fill="#fff" />
    <circle cx="30" cy="96" r="2" fill="#000" />
    <circle cx="40" cy="96" r="2" fill="#000" />
    <path d="M28 105 Q35 108 42 105" stroke="#000" strokeWidth="1.5" fill="none" />
    {/* Checkmark */}
    <path d="M75 45 L85 60 L105 35" stroke="#44ff88" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AttackSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="atkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff8844" />
        <stop offset="100%" stopColor="#ff4422" />
      </linearGradient>
      <filter id="fireGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Background burst */}
    <path d="M60 30 L75 60 L65 55 L80 90 L60 75 L55 110 L45 75 L30 85 L40 55 L25 50 L50 40 Z" fill="url(#atkGrad)" opacity="0.3" filter="url(#fireGlow)" />
    {/* Swords */}
    <g transform="translate(60, 80)">
      {/* Sword 1 */}
      <g transform="rotate(-30)">
        <rect x="-3" y="-50" width="6" height="70" fill="#ccc" rx="1" />
        <rect x="-8" y="15" width="16" height="4" fill="#888" />
        <rect x="-4" y="19" width="8" height="25" fill="#8b4513" rx="2" />
        <polygon points="0,-50 -5,-65 0,-75 5,-65" fill="#ccc" />
      </g>
      {/* Sword 2 */}
      <g transform="rotate(30)">
        <rect x="-3" y="-50" width="6" height="70" fill="#ddd" rx="1" />
        <rect x="-8" y="15" width="16" height="4" fill="#999" />
        <rect x="-4" y="19" width="8" height="25" fill="#a0522d" rx="2" />
        <polygon points="0,-50 -5,-65 0,-75 5,-65" fill="#ddd" />
      </g>
    </g>
    {/* Spark effects */}
    <circle cx="50" cy="45" r="3" fill="#ffff00" filter="url(#fireGlow)" />
    <circle cx="70" cy="50" r="2" fill="#ff8800" />
    <circle cx="60" cy="40" r="2.5" fill="#ffff44" />
    {/* Number 2 */}
    <text x="60" y="130" textAnchor="middle" fill="#ff6644" fontSize="24" fontWeight="bold">×2</text>
  </svg>
);

const SkipSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="skipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4488ff" />
        <stop offset="100%" stopColor="#2266cc" />
      </linearGradient>
    </defs>
    {/* Circular background */}
    <circle cx="60" cy="75" r="40" fill="none" stroke="url(#skipGrad)" strokeWidth="3" opacity="0.3" />
    {/* Skip arrow */}
    <g transform="translate(60, 75)">
      <path d="M-30 0 Q-15 -25 0 -25 Q20 -25 35 -10 L25 -5 L35 5 L45 -5" fill="none" stroke="#4488ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 5 L35 15 L45 5" fill="none" stroke="#4488ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    {/* Fast lines */}
    <path d="M20 60 L10 60 M20 75 L5 75 M20 90 L10 90" stroke="#66aaff" strokeWidth="2" opacity="0.6" />
    <path d="M100 60 L110 60 M100 75 L115 75 M100 90 L110 90" stroke="#66aaff" strokeWidth="2" opacity="0.6" />
    {/* Speed marks */}
    <text x="60" y="135" textAnchor="middle" fill="#4488ff" fontSize="20" fontWeight="bold" letterSpacing="2">SKIP</text>
  </svg>
);

const FavorSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#aa44ff" />
        <stop offset="100%" stopColor="#7722cc" />
      </linearGradient>
      <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff6b9d" />
        <stop offset="100%" stopColor="#c44569" />
      </linearGradient>
    </defs>
    {/* Gift box */}
    <rect x="35" y="70" width="50" height="45" rx="3" fill="url(#favGrad)" />
    {/* Ribbon vertical */}
    <rect x="55" y="70" width="10" height="45" fill="url(#ribbonGrad)" />
    {/* Ribbon horizontal */}
    <rect x="35" y="85" width="50" height="10" fill="url(#ribbonGrad)" />
    {/* Bow */}
    <path d="M50 70 Q40 55 45 50 Q55 55 60 70" fill="#ff6b9d" />
    <path d="M70 70 Q80 55 75 50 Q65 55 60 70" fill="#ff6b9d" />
    <circle cx="60" cy="70" r="5" fill="#c44569" />
    {/* Hands reaching */}
    <ellipse cx="25" cy="92" rx="8" ry="12" fill="#ffccaa" />
    <ellipse cx="95" cy="92" rx="8" ry="12" fill="#ffccaa" />
    {/* Heart */}
    <path d="M60 45 C60 40 55 35 50 35 C45 35 42 40 42 45 C42 55 60 65 60 65 C60 65 78 55 78 45 C78 40 75 35 70 35 C65 35 60 40 60 45" fill="#ff6b6b" />
    {/* Arrow indicating exchange */}
    <path d="M20 50 Q35 35 45 45" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="3,2" opacity="0.6" />
    <path d="M100 50 Q85 35 75 45" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="3,2" opacity="0.6" />
  </svg>
);

const ShuffleSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="shufGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#44cccc" />
        <stop offset="100%" stopColor="#2288aa" />
      </linearGradient>
    </defs>
    {/* Cards being shuffled */}
    <g transform="translate(60, 80)">
      {/* Card 1 */}
      <rect x="-20" y="-30" width="25" height="35" rx="2" fill="#2a1f4c" stroke="#44cccc" strokeWidth="1" transform="rotate(-20)" />
      <text x="-15" y="-10" fontSize="10" fill="#44cccc" transform="rotate(-20)">🐱</text>
      
      {/* Card 2 */}
      <rect x="-5" y="-35" width="25" height="35" rx="2" fill="#1f183b" stroke="#44cccc" strokeWidth="1" />
      <text x="0" y="-15" fontSize="10" fill="#44cccc">💣</text>
      
      {/* Card 3 */}
      <rect x="5" y="-25" width="25" height="35" rx="2" fill="#2a1f4c" stroke="#44cccc" strokeWidth="1" transform="rotate(15)" />
      <text x="12" y="-5" fontSize="10" fill="#44cccc" transform="rotate(15)">🔧</text>
    </g>
    {/* Shuffle arrows */}
    <path d="M30 50 Q60 30 90 50" stroke="#44cccc" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M30 110 Q60 130 90 110" stroke="#44cccc" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Arrowheads */}
    <polygon points="85,45 90,50 85,55" fill="#44cccc" />
    <polygon points="35,105 30,110 35,115" fill="#44cccc" />
    {/* Sparkle effects */}
    <text x="25" y="75" fontSize="16" fill="#44cccc">✨</text>
    <text x="90" y="85" fontSize="14" fill="#44cccc">✨</text>
    <text x="50" y="40" fontSize="12" fill="#66ddff">✦</text>
  </svg>
);

const SeeTheFutureSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="crystalGrad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#ff99dd" />
        <stop offset="50%" stopColor="#ff44aa" />
        <stop offset="100%" stopColor="#aa2288" />
      </radialGradient>
      <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#ddd" />
      </linearGradient>
    </defs>
    {/* Crystal ball */}
    <circle cx="60" cy="70" r="35" fill="url(#crystalGrad)" opacity="0.4" />
    <ellipse cx="60" cy="70" rx="30" ry="35" fill="url(#crystalGrad)" opacity="0.6" />
    {/* Shine */}
    <ellipse cx="50" cy="55" rx="12" ry="8" fill="#fff" opacity="0.4" />
    {/* Eye inside */}
    <ellipse cx="60" cy="70" rx="18" ry="12" fill="url(#eyeGrad)" />
    <circle cx="60" cy="70" r="8" fill="#44aaff" />
    <circle cx="60" cy="70" r="4" fill="#000" />
    <circle cx="62" cy="68" r="2" fill="#fff" />
    {/* Stand */}
    <path d="M45 100 Q60 115 75 100" stroke="#aa2288" strokeWidth="3" fill="none" />
    <ellipse cx="60" cy="103" rx="15" ry="5" fill="#662255" />
    {/* Cards peeking out */}
    <rect x="25" y="40" width="18" height="24" rx="2" fill="#2a1f4c" stroke="#ff44aa" strokeWidth="1" opacity="0.7" transform="rotate(-15)" />
    <rect x="77" y="40" width="18" height="24" rx="2" fill="#2a1f4c" stroke="#ff44aa" strokeWidth="1" opacity="0.7" transform="rotate(15)" />
    <rect x="51" y="35" width="18" height="24" rx="2" fill="#2a1f4c" stroke="#ff44aa" strokeWidth="1" opacity="0.9" />
    {/* Sparkles */}
    <text x="30" y="30" fontSize="14" fill="#ff88cc">✨</text>
    <text x="80" y="35" fontSize="12" fill="#ff88cc">✨</text>
    <text x="55" y="25" fontSize="10" fill="#ffaaee">⭐</text>
    {/* 3 */}
    <text x="60" y="145" textAnchor="middle" fill="#ff44aa" fontSize="20" fontWeight="bold">3</text>
  </svg>
);

const NopeSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="nopeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#888899" />
        <stop offset="100%" stopColor="#555566" />
      </linearGradient>
    </defs>
    {/* Stop hand */}
    <g transform="translate(60, 80)">
      {/* Palm */}
      <rect x="-20" y="-30" width="40" height="50" rx="8" fill="#ffccaa" />
      {/* Fingers */}
      <rect x="-18" y="-55" width="10" height="30" rx="5" fill="#ffccaa" />
      <rect x="-6" y="-60" width="10" height="35" rx="5" fill="#ffccaa" />
      <rect x="6" y="-58" width="10" height="33" rx="5" fill="#ffccaa" />
      <rect x="18" y="-45" width="10" height="20" rx="5" fill="#ffccaa" transform="rotate(-10)" />
      {/* Thumb */}
      <ellipse cx="22" cy="-10" rx="8" ry="12" fill="#ffccaa" transform="rotate(-20)" />
    </g>
    {/* NOPE text */}
    <circle cx="60" cy="60" r="28" fill="none" stroke="#ff4444" strokeWidth="4" />
    <text x="60" y="68" textAnchor="middle" fill="#ff4444" fontSize="22" fontWeight="bold" letterSpacing="1">NOPE</text>
    {/* Cancel lines */}
    <line x1="40" y1="40" x2="80" y2="80" stroke="#ff4444" strokeWidth="3" opacity="0.8" />
    <line x1="80" y1="40" x2="40" y2="80" stroke="#ff4444" strokeWidth="3" opacity="0.6" />
    {/* Card being cancelled */}
    <rect x="25" y="110" width="25" height="32" rx="2" fill="#2a1f4c" stroke="#666" strokeWidth="1" opacity="0.5" transform="rotate(-10)" />
    <line x1="28" y1="125" x2="47" y2="125" stroke="#ff4444" strokeWidth="2" opacity="0.8" transform="rotate(-10)" />
  </svg>
);

const TacoCatSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="tacoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffaa33" />
        <stop offset="100%" stopColor="#cc7722" />
      </linearGradient>
    </defs>
    {/* Taco shell */}
    <path d="M30 70 Q60 55 90 70 L85 95 Q60 105 35 95 Z" fill="url(#tacoGrad)" stroke="#aa6622" strokeWidth="2" />
    {/* Fillings */}
    <path d="M35 75 Q60 65 85 75" stroke="#44aa44" strokeWidth="6" fill="none" />
    <path d="M38 80 Q60 72 82 80" stroke="#ff4444" strokeWidth="4" fill="none" />
    {/* Cat face peeking */}
    <ellipse cx="60" cy="55" rx="18" ry="15" fill="#ffaa88" />
    {/* Ears */}
    <path d="M45 48 L48 35 L55 45" fill="#ff9977" />
    <path d="M75 48 L72 35 L65 45" fill="#ff9977" />
    {/* Face */}
    <circle cx="54" cy="52" r="4" fill="#fff" />
    <circle cx="66" cy="52" r="4" fill="#fff" />
    <circle cx="54" cy="53" r="2" fill="#000" />
    <circle cx="66" cy="53" r="2" fill="#000" />
    {/* Nose */}
    <path d="M58 57 L62 57 L60 60 Z" fill="#ff6699" />
    {/* Cat body hidden in taco */}
    <ellipse cx="60" cy="110" rx="20" ry="25" fill="#ffaa88" />
    {/* Paws */}
    <ellipse cx="45" cy="105" rx="6" ry="8" fill="#ff9977" />
    <ellipse cx="75" cy="105" rx="6" ry="8" fill="#ff9977" />
    {/* Tail */}
    <path d="M80 115 Q95 110 95 95" stroke="#ff9977" strokeWidth="6" fill="none" strokeLinecap="round" />
  </svg>
);

const RainbowCatSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ff4444" />
        <stop offset="20%" stopColor="#ffaa00" />
        <stop offset="40%" stopColor="#ffff00" />
        <stop offset="60%" stopColor="#44ff44" />
        <stop offset="80%" stopColor="#4444ff" />
        <stop offset="100%" stopColor="#aa44ff" />
      </linearGradient>
    </defs>
    {/* Rainbow */}
    <path d="M20 100 Q60 30 100 100" fill="none" stroke="url(#rainbowGrad)" strokeWidth="12" strokeLinecap="round" />
    <path d="M25 100 Q60 40 95 100" fill="none" stroke="url(#rainbowGrad)" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
    {/* Clouds */}
    <ellipse cx="25" cy="100" rx="12" ry="8" fill="#fff" />
    <ellipse cx="35" cy="95" rx="10" ry="7" fill="#fff" />
    <ellipse cx="95" cy="100" rx="12" ry="8" fill="#fff" />
    <ellipse cx="85" cy="95" rx="10" ry="7" fill="#fff" />
    {/* Cat */}
    <ellipse cx="60" cy="85" rx="15" ry="18" fill="#444" />
    {/* Ears */}
    <path d="M48 75 L50 60 L58 72" fill="#444" />
    <path d="M72 75 L70 60 L62 72" fill="#444" />
    {/* Face */}
    <circle cx="55" cy="80" r="4" fill="#ffff00" />
    <circle cx="65" cy="80" r="4" fill="#ffff00" />
    <circle cx="55" cy="81" r="2" fill="#000" />
    <circle cx="65" cy="81" r="2" fill="#000" />
    {/* Sparkles */}
    <text x="40" y="50" fontSize="12" fill="#ffff00">✨</text>
    <text x="75" y="55" fontSize="10" fill="#ff88ff">✨</text>
    <text x="55" y="40" fontSize="14" fill="#88ffff">⭐</text>
  </svg>
);

const BeardCatSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="beardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b4513" />
        <stop offset="100%" stopColor="#5a2d0c" />
      </linearGradient>
    </defs>
    {/* Cat face */}
    <ellipse cx="60" cy="70" rx="22" ry="20" fill="#d48844" />
    {/* Ears */}
    <path d="M40 58 L42 38 L52 55" fill="#c47834" />
    <path d="M80 58 L78 38 L68 55" fill="#c47834" />
    {/* Face */}
    <circle cx="52" cy="65" r="5" fill="#fff" />
    <circle cx="68" cy="65" r="5" fill="#fff" />
    <circle cx="52" cy="66" r="3" fill="#228822" />
    <circle cx="68" cy="66" r="3" fill="#228822" />
    {/* Nose */}
    <path d="M57 72 L63 72 L60 76 Z" fill="#ff9999" />
    {/* BEARD - the main feature */}
    <ellipse cx="60" cy="88" rx="18" ry="12" fill="url(#beardGrad)" />
    <path d="M42 85 Q60 100 78 85" fill="url(#beardGrad)" />
    {/* Beard texture */}
    <path d="M48 90 L46 105 M55 92 L54 110 M65 92 L66 110 M72 90 L74 105" stroke="#5a2d0c" strokeWidth="1.5" opacity="0.6" />
    {/* Glasses */}
    <circle cx="52" cy="65" r="10" fill="none" stroke="#333" strokeWidth="2" />
    <circle cx="68" cy="65" r="10" fill="none" stroke="#333" strokeWidth="2" />
    <line x1="62" y1="65" x2="58" y2="65" stroke="#333" strokeWidth="2" />
    {/* Mustache */}
    <path d="M52 78 Q45 82 40 78 M68 78 Q75 82 80 78" stroke="#5a2d0c" strokeWidth="2" fill="none" />
  </svg>
);

const CattermelonSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="melonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#44cc66" />
        <stop offset="100%" stopColor="#228844" />
      </linearGradient>
      <linearGradient id="melonInner" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff6666" />
        <stop offset="100%" stopColor="#cc4444" />
      </linearGradient>
    </defs>
    {/* Watermelon slice */}
    <path d="M20 70 Q60 120 100 70 Q60 40 20 70" fill="url(#melonGrad)" stroke="#228844" strokeWidth="2" />
    <path d="M28 70 Q60 105 92 70 Q60 50 28 70" fill="url(#melonInner)" />
    {/* Seeds */}
    <ellipse cx="45" cy="75" rx="2" ry="4" fill="#000" opacity="0.7" />
    <ellipse cx="60" cy="82" rx="2" ry="4" fill="#000" opacity="0.7" />
    <ellipse cx="75" cy="75" rx="2" ry="4" fill="#000" opacity="0.7" />
    <ellipse cx="55" cy="68" rx="2" ry="4" fill="#000" opacity="0.7" />
    <ellipse cx="68" cy="68" rx="2" ry="4" fill="#000" opacity="0.7" />
    {/* Cat ears popping out */}
    <path d="M45 50 L48 35 L58 48" fill="#44cc66" />
    <path d="M75 50 L72 35 L62 48" fill="#44cc66" />
    {/* Cat face */}
    <ellipse cx="60" cy="55" rx="14" ry="12" fill="#66dd88" />
    <circle cx="55" cy="53" r="3.5" fill="#fff" />
    <circle cx="65" cy="53" r="3.5" fill="#fff" />
    <circle cx="55" cy="54" r="1.5" fill="#000" />
    <circle cx="65" cy="54" r="1.5" fill="#000" />
    {/* Smile */}
    <path d="M56 60 Q60 63 64 60" stroke="#000" strokeWidth="1.5" fill="none" />
  </svg>
);

const PotatoCatSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="potatoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#deb887" />
        <stop offset="100%" stopColor="#8b7355" />
      </linearGradient>
    </defs>
    {/* Potato body */}
    <ellipse cx="60" cy="85" rx="35" ry="28" fill="url(#potatoGrad)" stroke="#8b7355" strokeWidth="1" />
    {/* Potato eyes (the vegetable kind) */}
    <circle cx="45" cy="75" r="4" fill="#654321" opacity="0.6" />
    <circle cx="75" cy="78" r="3" fill="#654321" opacity="0.6" />
    <circle cx="55" cy="95" r="2.5" fill="#654321" opacity="0.6" />
    {/* Sprouts */}
    <path d="M45 62 Q40 45 35 50" stroke="#44aa44" strokeWidth="2" fill="none" />
    <ellipse cx="35" cy="48" rx="4" ry="6" fill="#66cc66" />
    <path d="M60 58 Q60 40 55 42" stroke="#44aa44" strokeWidth="2" fill="none" />
    <ellipse cx="55" cy="40" rx="3" ry="5" fill="#66cc66" />
    <path d="M75 62 Q80 48 85 52" stroke="#44aa44" strokeWidth="2" fill="none" />
    <ellipse cx="85" cy="50" rx="3.5" ry="5.5" fill="#66cc66" />
    {/* Cat face */}
    <ellipse cx="60" cy="80" rx="18" ry="15" fill="#deb887" />
    {/* Cat ears */}
    <path d="M48 72 L50 60 L57 70" fill="#ccaa77" />
    <path d="M72 72 L70 60 L63 70" fill="#ccaa77" />
    {/* Cat eyes */}
    <circle cx="54" cy="78" r="4" fill="#fff" />
    <circle cx="66" cy="78" r="4" fill="#fff" />
    <circle cx="54" cy="79" r="2" fill="#000" />
    <circle cx="66" cy="79" r="2" fill="#000" />
    {/* Small smile */}
    <path d="M56 86 Q60 89 64 86" stroke="#000" strokeWidth="1.5" fill="none" />
    {/* Paws */}
    <ellipse cx="42" cy="105" rx="5" ry="7" fill="#ccaa77" />
    <ellipse cx="78" cy="105" rx="5" ry="7" fill="#ccaa77" />
  </svg>
);

const ImplodingKittenSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="ikGrad" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stopColor="#cc66ff" />
        <stop offset="50%" stopColor="#7b2fbe" />
        <stop offset="100%" stopColor="#2a004a" />
      </radialGradient>
      <filter id="ikGlow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Collapsing vortex rings */}
    {[40, 30, 20, 10].map((r, i) => (
      <circle key={i} cx="60" cy="65" r={r} fill="none" stroke="#aa44ff" strokeWidth="2" opacity={0.15 + i * 0.2} />
    ))}
    {/* Imploding spiral arms */}
    <path d="M60 65 Q90 40 80 75 Q70 95 60 65" fill="#9933ee" opacity="0.4" />
    <path d="M60 65 Q30 40 40 75 Q50 95 60 65" fill="#9933ee" opacity="0.4" />
    <path d="M60 65 Q85 90 65 50 Q45 25 60 65" fill="#cc66ff" opacity="0.3" />
    {/* Kitten being imploded */}
    <ellipse cx="60" cy="68" rx="18" ry="16" fill="#cc99ee" />
    {/* Ears */}
    <path d="M45 58 L48 43 L56 56" fill="#bb77dd" />
    <path d="M75 58 L72 43 L64 56" fill="#bb77dd" />
    {/* Face — scared */}
    <circle cx="54" cy="64" r="4" fill="#fff" />
    <circle cx="66" cy="64" r="4" fill="#fff" />
    <circle cx="54" cy="65" r="2.5" fill="#220044" />
    <circle cx="66" cy="65" r="2.5" fill="#220044" />
    {/* Swirly pupils */}
    <circle cx="53" cy="64" r="1" fill="#aa22ff" />
    <circle cx="65" cy="64" r="1" fill="#aa22ff" />
    {/* Scared mouth */}
    <path d="M56 73 Q60 70 64 73" stroke="#220044" strokeWidth="1.5" fill="none" />
    {/* Radioactive symbol */}
    <circle cx="60" cy="130" r="12" fill="none" stroke="#aa44ff" strokeWidth="2" filter="url(#ikGlow)" />
    <circle cx="60" cy="130" r="4" fill="#aa44ff" />
    <path d="M60 122 L56 116 L64 116 Z" fill="#aa44ff" />
    <path d="M53 134 L47 140 L51 143 Z" fill="#aa44ff" />
    <path d="M67 134 L73 140 L69 143 Z" fill="#aa44ff" />
    {/* Warning text */}
    <text x="60" y="155" textAnchor="middle" fill="#cc66ff" fontSize="8" fontWeight="bold" filter="url(#ikGlow)">IMPLODING</text>
  </svg>
);

const ReverseSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="revGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#44bbff" />
        <stop offset="100%" stopColor="#0066cc" />
      </linearGradient>
    </defs>
    {/* Outer reverse arrows */}
    <path d="M25 55 Q60 20 95 55" fill="none" stroke="#44bbff" strokeWidth="5" strokeLinecap="round" />
    <polygon points="90,47 95,55 86,58" fill="#44bbff" />
    <path d="M95 105 Q60 140 25 105" fill="none" stroke="#1da1f2" strokeWidth="5" strokeLinecap="round" />
    <polygon points="30,113 25,105 34,102" fill="#1da1f2" />
    {/* Inner circle */}
    <circle cx="60" cy="80" r="22" fill="none" stroke="#44bbff" strokeWidth="2" opacity="0.4" />
    {/* Kitten face in center */}
    <ellipse cx="60" cy="80" rx="16" ry="14" fill="#99ccff" />
    <path d="M48 72 L51 60 L58 71" fill="#77aaee" />
    <path d="M72 72 L69 60 L62 71" fill="#77aaee" />
    <circle cx="54" cy="77" r="3.5" fill="#fff" />
    <circle cx="66" cy="77" r="3.5" fill="#fff" />
    <circle cx="54" cy="78" r="2" fill="#003388" />
    <circle cx="66" cy="78" r="2" fill="#003388" />
    {/* Dizzy eyes */}
    <path d="M52 76 L53 74 M55 74 L56 76" stroke="#003388" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M64 76 L65 74 M67 74 L68 76" stroke="#003388" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M56 83 Q60 86 64 83" stroke="#003388" strokeWidth="1.5" fill="none" />
    <text x="60" y="138" textAnchor="middle" fill="#44bbff" fontSize="14" fontWeight="bold" letterSpacing="1">REVERSE</text>
  </svg>
);

const DrawFromBottomSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="dfbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffaa44" />
        <stop offset="100%" stopColor="#cc6600" />
      </linearGradient>
    </defs>
    {/* Stack of cards (top) */}
    <rect x="35" y="28" width="50" height="65" rx="4" fill="#2a1f4c" stroke="#443466" strokeWidth="1.5" transform="rotate(-3 60 60)" opacity="0.5" />
    <rect x="35" y="28" width="50" height="65" rx="4" fill="#231a3d" stroke="#443466" strokeWidth="1.5" transform="rotate(2 60 60)" opacity="0.7" />
    <rect x="35" y="28" width="50" height="65" rx="4" fill="#1c1530" stroke="#665588" strokeWidth="2" />
    {/* Cat on front card */}
    <ellipse cx="60" cy="55" rx="13" ry="12" fill="#ffcc88" />
    <path d="M50 48 L52 37 L59 47" fill="#ffaa66" />
    <path d="M70 48 L68 37 L61 47" fill="#ffaa66" />
    <circle cx="55" cy="52" r="3" fill="#fff" />
    <circle cx="65" cy="52" r="3" fill="#fff" />
    <circle cx="55" cy="53" r="1.5" fill="#000" />
    <circle cx="65" cy="53" r="1.5" fill="#000" />
    <path d="M57 59 Q60 62 63 59" stroke="#000" strokeWidth="1.5" fill="none" />
    {/* Arrow pointing down and coming out the bottom */}
    <path d="M60 95 L60 120" stroke="#ffaa44" strokeWidth="4" strokeLinecap="round" />
    <polygon points="52,115 60,128 68,115" fill="#ffaa44" />
    {/* Bottom card sliding out */}
    <rect x="32" y="118" width="56" height="30" rx="3" fill="#2a1f4c" stroke="url(#dfbGrad)" strokeWidth="2" opacity="0.9" />
    <text x="60" y="138" textAnchor="middle" fill="#ffaa44" fontSize="9" fontWeight="bold">BOTTOM</text>
    {/* Dotted line indicating bottom */}
    <line x1="20" y1="118" x2="100" y2="118" stroke="#ffaa44" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
  </svg>
);

const FeralCatSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="fcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#44ee99" />
        <stop offset="100%" stopColor="#118844" />
      </linearGradient>
      <filter id="fcGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Wild swirling energy aura */}
    <circle cx="60" cy="70" r="38" fill="none" stroke="#44ee99" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
    <circle cx="60" cy="70" r="30" fill="none" stroke="#2ecc71" strokeWidth="1" strokeDasharray="3,5" opacity="0.4" />
    {/* Feral cat body — scruffy */}
    <ellipse cx="60" cy="90" rx="22" ry="26" fill="#228855" />
    {/* Scruff marks */}
    <path d="M45 80 L42 72 M50 76 L47 67 M70 76 L73 67 M75 80 L78 72" stroke="#33aa66" strokeWidth="2" strokeLinecap="round" />
    {/* Wild ears — asymmetric */}
    <path d="M42 68 L38 48 L52 64" fill="#1a6644" />
    <path d="M78 68 L83 50 L68 64" fill="#1a6644" />
    {/* Feral face */}
    <ellipse cx="60" cy="72" rx="18" ry="16" fill="#33bb77" />
    {/* Wild eyes — different sizes */}
    <circle cx="52" cy="68" r="5" fill="#fff" />
    <circle cx="68" cy="68" r="4" fill="#fff" />
    <circle cx="52" cy="69" r="3" fill="#001a0a" />
    <circle cx="68" cy="69" r="2.5" fill="#001a0a" />
    {/* Glowing pupils */}
    <circle cx="52" cy="69" r="1.5" fill="#44ee99" filter="url(#fcGlow)" />
    <circle cx="68" cy="69" r="1.2" fill="#44ee99" filter="url(#fcGlow)" />
    {/* Snarling mouth */}
    <path d="M54 79 Q57 83 60 79 Q63 83 66 79" stroke="#001a0a" strokeWidth="1.5" fill="none" />
    <line x1="60" y1="79" x2="60" y2="84" stroke="#001a0a" strokeWidth="1.5" />
    {/* Long wild whiskers */}
    <path d="M42 74 L22 70 M42 77 L22 78 M42 80 L23 85" stroke="#44ee99" strokeWidth="1" opacity="0.8" />
    <path d="M78 74 L98 70 M78 77 L98 78 M78 80 L97 85" stroke="#44ee99" strokeWidth="1" opacity="0.8" />
    {/* Wild card badge */}
    <rect x="40" y="118" width="40" height="16" rx="8" fill="#44ee99" opacity="0.9" />
    <text x="60" y="130" textAnchor="middle" fill="#001a0a" fontSize="8" fontWeight="bold" letterSpacing="1">WILD</text>
    {/* Mini cat silhouettes showing wild pairings */}
    <text x="60" y="152" textAnchor="middle" fill="#44ee99" fontSize="11" opacity="0.8">😾 + ANY CAT</text>
  </svg>
);

export function CardIllustration({ type, className = '' }: CardIllustrationProps) {
  const illustrations: Record<CardType, React.ReactNode> = {
    exploding_kitten: <ExplodingKittenSVG />,
    defuse: <DefuseSVG />,
    attack: <AttackSVG />,
    skip: <SkipSVG />,
    favor: <FavorSVG />,
    shuffle: <ShuffleSVG />,
    see_the_future: <SeeTheFutureSVG />,
    nope: <NopeSVG />,
    taco_cat: <TacoCatSVG />,
    rainbow_cat: <RainbowCatSVG />,
    beard_cat: <BeardCatSVG />,
    cattermelon: <CattermelonSVG />,
    potato_cat: <PotatoCatSVG />,
    // Imploding Kittens expansion
    imploding_kitten: <ImplodingKittenSVG />,
    reverse: <ReverseSVG />,
    draw_from_bottom: <DrawFromBottomSVG />,
    feral_cat: <FeralCatSVG />,
    streaking_kitten: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="55" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3"/>
        <text x="60" y="75" textAnchor="middle" fontSize="52">💨</text>
        <text x="60" y="110" textAnchor="middle" fontSize="12" fill="#92400e" fontWeight="bold">SHIELD</text>
      </svg>
    ),
  };

  return (
    <div className={`relative ${className}`}>
      {illustrations[type]}
    </div>
  );
}

export default CardIllustration;
