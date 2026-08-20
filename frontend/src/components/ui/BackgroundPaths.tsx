import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Flowing line paths drawn behind a hero.
 *
 * Adapted from KokonutUI's Background Paths, re-skinned onto our own ramp —
 * the original's purple/pink/blue belongs to a different product. Path counts
 * are cut from 37 to 24: every one is an animated stroke, and the clinician
 * portal already runs charts on the same screen.
 */

interface PathData {
  id: string;
  d: string;
  opacity: number;
  width: number;
}

type Band = 'primary' | 'secondary' | 'accent';

const AMPLITUDE: Record<Band, number> = { primary: 150, secondary: 100, accent: 60 };
const SEGMENTS: Record<Band, number> = { primary: 10, secondary: 8, accent: 6 };

/**
 * One eased sweep across the viewBox with three sine waves layered on it.
 * The amplitude decays along the sweep, so the lines gather as they leave.
 */
function aestheticPath(index: number, position: number, band: Band): string {
  const amplitude = AMPLITUDE[band];
  const segments = SEGMENTS[band];
  const phase = index * 0.2;

  const startX = 2400;
  const startY = 800;
  const endX = -2400;
  const endY = -800 + index * 25;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const progress = i / segments;
    const eased = 1 - (1 - progress) ** 2;
    const decay = 1 - eased * 0.3;

    points.push({
      x: (startX + (endX - startX) * eased) * position,
      y: startY + (endY - startY) * eased
        + Math.sin(progress * Math.PI * 3 + phase) * amplitude * 0.7 * decay
        + Math.cos(progress * Math.PI * 4 + phase) * amplitude * 0.3 * decay
        + Math.sin(progress * Math.PI * 2 + phase) * amplitude * 0.2 * decay,
    });
  }

  return points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const t = 0.4;
      return `C ${prev.x + (p.x - prev.x) * t} ${prev.y}, `
        + `${prev.x + (p.x - prev.x) * (1 - t)} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(' ');
}

const band = (count: number, position: number, kind: Band, baseOpacity: number, step: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${kind}-${i}`,
    d: aestheticPath(i, position, kind),
    opacity: baseOpacity + i * step,
    width: (kind === 'primary' ? 4 : kind === 'secondary' ? 3 : 2) + i * 0.3,
  })) as PathData[];

const FloatingPaths = memo(function FloatingPaths({ position }: { position: number }) {
  const primary = useMemo(() => band(8, position, 'primary', 0.15, 0.02), [position]);
  const secondary = useMemo(() => band(10, position, 'secondary', 0.12, 0.015), [position]);
  const accent = useMemo(() => band(6, position, 'accent', 0.1, 0.03), [position]);

  const groups: { paths: PathData[]; drift: number; seconds: number; opacity: number }[] = [
    { paths: primary, drift: -15, seconds: 8, opacity: 1 },
    { paths: secondary, drift: -10, seconds: 6, opacity: 0.8 },
    { paths: accent, drift: -5, seconds: 4, opacity: 0.6 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="h-full w-full"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="-2400 -800 4800 1600"
        aria-hidden
      >
        <defs>
          <linearGradient id="mcPathGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(91, 131, 251, 0.55)" />
            <stop offset="50%" stopColor="rgba(69, 205, 214, 0.5)" />
            <stop offset="100%" stopColor="rgba(255, 145, 89, 0.45)" />
          </linearGradient>
        </defs>

        {groups.map((g, gi) => (
          <g key={gi} style={{ opacity: g.opacity }}>
            {g.paths.map((path) => (
              <motion.path
                key={path.id}
                d={path.d}
                stroke="url(#mcPathGradient)"
                strokeLinecap="round"
                strokeWidth={path.width}
                style={{ opacity: path.opacity }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: path.opacity, scale: 1, y: [0, g.drift, 0] }}
                transition={{
                  opacity: { duration: 1 },
                  scale: { duration: 1 },
                  y: {
                    duration: g.seconds,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  },
                }}
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
});

/**
 * Drop behind any hero. The parent needs `position: relative`; this fills it
 * and never takes pointer events.
 */
export const BackgroundPaths = memo(function BackgroundPaths({
  className = '',
}: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden ${className}`}>
      <FloatingPaths position={1} />
    </div>
  );
});
