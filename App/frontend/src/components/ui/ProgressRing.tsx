import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: string;
  gradientId?: string;
}

/**
 * Animated progress ring — the stroke draws itself on mount with a spring,
 * filled with the brand gradient and a soft glow.
 */
export function ProgressRing({
  value,
  size = 128,
  stroke = 11,
  label,
  sublabel,
  gradientId = 'ringGrad',
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3f66f0" />
            <stop offset="55%" stopColor="#5b83fb" />
            <stop offset="100%" stopColor="#22b8c4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(63,102,240,0.10)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 4px 10px rgba(63,102,240,0.4))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-bold tracking-tight text-ink">{label}</div>
          {sublabel && <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}
