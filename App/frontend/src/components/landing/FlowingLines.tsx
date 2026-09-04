import { cn } from '@/lib/cn';

interface FlowingLinesProps {
  className?: string;
}

/** The wires: smooth flowing curves, each drawn with its own gradient stroke. */
const WIRES = [
  { id: 'wire-a', d: 'M-20,150 C240,70 420,210 700,140 C940,80 1140,196 1460,120', grad: 'gradA', w: 2, o: 0.9 },
  { id: 'wire-b', d: 'M-20,176 C260,112 470,238 720,166 C980,104 1180,206 1460,150', grad: 'gradB', w: 1.6, o: 0.8 },
  { id: 'wire-c', d: 'M-20,120 C220,58 430,182 690,110 C950,48 1160,162 1460,94', grad: 'gradC', w: 1.6, o: 0.75 },
  { id: 'wire-d', d: 'M-20,202 C280,150 500,256 760,196 C1000,150 1220,226 1460,180', grad: 'gradD', w: 1.4, o: 0.7 },
  { id: 'wire-e', d: 'M-20,136 C250,96 440,202 710,130 C970,70 1170,176 1460,110', grad: 'gradE', w: 1.2, o: 0.55 },
];

/** Glowing dots that travel along a given wire. */
const TRAVELLERS = [
  { path: 'wire-a', color: '#22b8c4', r: 4, dur: 9, begin: 0 },
  { path: 'wire-c', color: '#7c5cf0', r: 3.5, dur: 11, begin: -3 },
  { path: 'wire-d', color: '#f5b544', r: 3.5, dur: 13, begin: -6 },
  { path: 'wire-b', color: '#3f66f0', r: 3, dur: 10, begin: -1.5 },
];

export function FlowingLines({ className }: FlowingLinesProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 240"
      preserveAspectRatio="none"
      className={cn('pointer-events-none w-full', className)}
    >
      <defs>
        <linearGradient id="gradA" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22b8c4" stopOpacity="0" />
          <stop offset="30%" stopColor="#22b8c4" />
          <stop offset="70%" stopColor="#3f66f0" />
          <stop offset="100%" stopColor="#3f66f0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradB" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3f66f0" stopOpacity="0" />
          <stop offset="40%" stopColor="#3f66f0" />
          <stop offset="100%" stopColor="#7c5cf0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradC" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c5cf0" stopOpacity="0" />
          <stop offset="45%" stopColor="#7c5cf0" />
          <stop offset="100%" stopColor="#22b8c4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradD" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f5b544" stopOpacity="0" />
          <stop offset="50%" stopColor="#f5b544" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ec7fb0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradE" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a3c0ff" stopOpacity="0" />
          <stop offset="50%" stopColor="#a3c0ff" />
          <stop offset="100%" stopColor="#a3c0ff" stopOpacity="0" />
        </linearGradient>
        <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* the wires — each in its own group with a gentle breathing drift */}
      {WIRES.map((wire, i) => (
        <g key={wire.id} style={{ animation: `wireDrift ${16 + i * 3}s ease-in-out ${-i * 2}s infinite alternate` }}>
          <path
            id={wire.id}
            d={wire.d}
            fill="none"
            stroke={`url(#${wire.grad})`}
            strokeWidth={wire.w}
            strokeLinecap="round"
            opacity={wire.o}
          />
        </g>
      ))}

      {/* traveling dots */}
      {TRAVELLERS.map((t, i) => (
        <circle key={i} r={t.r} fill={t.color} filter="url(#dotGlow)">
          <animateMotion dur={`${t.dur}s`} begin={`${t.begin}s`} repeatCount="indefinite" rotate="auto">
            <mpath href={`#${t.path}`} />
          </animateMotion>
        </circle>
      ))}

      <style>{`
        @keyframes wireDrift {
          0%   { transform: translateY(0px); }
          100% { transform: translateY(10px); }
        }
      `}</style>
    </svg>
  );
}
