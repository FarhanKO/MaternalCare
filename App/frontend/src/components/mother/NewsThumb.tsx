import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { NewsImage } from '@/data/reading';

/**
 * Each story's artwork.
 *
 * Drawn rather than photographed — the app ships no image assets and cannot
 * reach a CDN, so every thumbnail is generated from the dashboard palette.
 *
 * The first version shared five decorative motifs across fourteen topics and
 * stamped a centred icon on top, so a story about sleep and a story about
 * mental health were the same picture in different colours. Each topic now has
 * its own small scene: a moon over a pillow, a cuff and a dial, a plotted
 * growth line. They also no longer stretch — the artwork is drawn square and
 * cropped, rather than squashed into the tile's aspect ratio.
 */

const W = '#fff';

/** Shorthands so each scene below stays a few readable lines. */
const soft = { fill: W, fillOpacity: 0.18 };
const line = { fill: 'none', stroke: W, strokeOpacity: 0.85, strokeWidth: 3.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const faint = { fill: 'none', stroke: W, strokeOpacity: 0.3, strokeWidth: 3, strokeLinecap: 'round' as const };

const SCENES: Record<NewsImage, ReactNode> = {
  /* a moon, and the quiet dark around it */
  sleep: (
    <>
      <circle cx="72" cy="34" r="30" {...soft} />
      <path d="M80 22a20 20 0 1 0 0 32 24 24 0 0 1 0-32z" fill={W} fillOpacity="0.9" />
      <path d="M8 78q22-14 44 0t40-6" {...faint} />
      {[22, 44, 66].map((x) => <circle key={x} cx={x} cy={20 + (x % 13)} r="2.4" fill={W} fillOpacity="0.5" />)}
    </>
  ),

  /* an apple, halved by a leaf */
  nutrition: (
    <>
      <circle cx="50" cy="58" r="30" {...soft} />
      <path d="M50 34c-14 0-22 10-22 22s10 26 22 26 22-12 22-26-8-22-22-22z" fill={W} fillOpacity="0.85" />
      <path d="M50 34V20" {...line} />
      <path d="M50 24q14-10 22-2-8 12-22 2z" fill={W} fillOpacity="0.55" />
    </>
  ),

  /* a cuff reading, as a dial with a needle */
  bp: (
    <>
      <path d="M14 62a36 36 0 0 1 72 0" {...faint} strokeWidth={7} />
      <path d="M14 62a36 36 0 0 1 26-34.6" {...line} strokeWidth={7} />
      <path d="M50 62 70 40" {...line} />
      <circle cx="50" cy="62" r="5.5" fill={W} />
      <path d="M20 80h60" {...faint} />
    </>
  ),

  /* a syringe on the diagonal, with a drop */
  vaccine: (
    <>
      <circle cx="70" cy="30" r="26" {...soft} />
      <path d="M26 76 62 40" {...line} strokeWidth={9} strokeOpacity={0.55} />
      <path d="M20 82 30 72" {...line} />
      <path d="M56 34 74 52" {...line} strokeWidth={9} />
      <path d="M66 24 80 38" {...line} />
      <circle cx="34" cy="34" r="5" fill={W} fillOpacity="0.75" />
    </>
  ),

  /* small kicks, radiating */
  movement: (
    <>
      <circle cx="46" cy="56" r="24" {...soft} />
      <circle cx="46" cy="56" r="12" fill={W} fillOpacity="0.8" />
      <path d="M46 30a26 26 0 0 1 0 52" {...faint} />
      <path d="M78 26q8 10 0 20" {...line} strokeOpacity={0.6} />
      <path d="M86 18q14 18 0 36" {...faint} />
      <circle cx="24" cy="26" r="3.4" fill={W} fillOpacity="0.6" />
    </>
  ),

  /* a head, and the weather inside it clearing */
  mind: (
    <>
      <path d="M50 20c18 0 30 14 30 30 0 16-10 22-10 32H30c0-10-10-16-10-32 0-16 12-30 30-30z" {...soft} />
      <path d="M34 54q8-12 16 0t16-6" {...line} />
      <circle cx="50" cy="76" r="4" fill={W} fillOpacity="0.8" />
      <path d="M40 88h20" {...faint} />
    </>
  ),

  /* a walk: rising steps and a figure */
  exercise: (
    <>
      <path d="M12 84h18V66h18V48h18V32h18" {...faint} strokeWidth={6} />
      <circle cx="34" cy="30" r="7" fill={W} fillOpacity="0.9" />
      <path d="M34 38v16m0 0-10 14m10-14 10 12M24 44l20-4" {...line} />
    </>
  ),

  /* a slide under glass */
  screening: (
    <>
      <circle cx="58" cy="42" r="24" {...soft} />
      <circle cx="58" cy="42" r="24" {...line} strokeOpacity={0.7} />
      <path d="M41 59 20 80" {...line} strokeWidth={7} />
      <path d="M46 42h24M52 34h12M50 50h18" {...line} strokeWidth={3} strokeOpacity={0.75} />
    </>
  ),

  /* a glass filling */
  hydration: (
    <>
      <path d="M50 12c14 20 22 30 22 42a22 22 0 0 1-44 0c0-12 8-22 22-42z" {...soft} />
      <path d="M50 12c14 20 22 30 22 42a22 22 0 0 1-44 0c0-12 8-22 22-42z" {...line} />
      <path d="M32 58q9-7 18 0t18 0v-4a22 22 0 0 1-36 4z" fill={W} fillOpacity="0.55" />
      <path d="M22 84h56" {...faint} />
    </>
  ),

  /* a bottle, and a measure */
  feeding: (
    <>
      <path d="M36 30h28v46a14 14 0 0 1-28 0z" {...soft} />
      <path d="M36 30h28v46a14 14 0 0 1-28 0z" {...line} />
      <path d="M40 18h20v12H40z" fill={W} fillOpacity="0.75" />
      <path d="M42 48h10M42 58h10M42 68h10" {...line} strokeWidth={3} strokeOpacity={0.7} />
    </>
  ),

  /* footprints, coming back */
  recovery: (
    <>
      <ellipse cx="34" cy="40" rx="11" ry="15" fill={W} fillOpacity="0.75" />
      <ellipse cx="34" cy="24" rx="5" ry="4" fill={W} fillOpacity="0.55" />
      <ellipse cx="64" cy="66" rx="11" ry="15" {...soft} />
      <ellipse cx="64" cy="50" rx="5" ry="4" {...soft} />
      <path d="M14 88q30-8 72 0" {...faint} />
    </>
  ),

  /* a cycle, with its window marked */
  fertility: (
    <>
      <circle cx="50" cy="50" r="30" {...faint} strokeWidth={6} />
      <path d="M50 20a30 30 0 0 1 26 15" {...line} strokeWidth={6} />
      <circle cx="76" cy="35" r="6" fill={W} />
      <circle cx="50" cy="50" r="9" fill={W} fillOpacity="0.55" />
    </>
  ),

  /* a stethoscope's bell and tubing */
  clinic: (
    <>
      <path d="M28 18v22a20 20 0 0 0 40 0V18" {...line} />
      <circle cx="28" cy="16" r="5" fill={W} fillOpacity="0.85" />
      <circle cx="68" cy="16" r="5" fill={W} fillOpacity="0.85" />
      <path d="M48 60v10a14 14 0 0 0 28 0v-4" {...line} strokeOpacity={0.7} />
      <circle cx="76" cy="60" r="9" {...soft} />
      <circle cx="76" cy="60" r="9" {...line} strokeWidth={3} />
    </>
  ),

  /* stacked blocks, growing */
  child: (
    <>
      <rect x="18" y="60" width="24" height="24" rx="5" {...soft} />
      <rect x="46" y="46" width="24" height="38" rx="5" fill={W} fillOpacity="0.32" />
      <rect x="18" y="60" width="24" height="24" rx="5" {...line} strokeWidth={3} />
      <rect x="46" y="46" width="24" height="38" rx="5" {...line} strokeWidth={3} />
      <path d="M22 34l8 8 14-16" {...line} />
    </>
  ),
};

const GRADIENT: Record<NewsImage, [string, string]> = {
  sleep: ['#5b83fb', '#26276b'],
  nutrition: ['#3fd1a8', '#0f7a63'],
  bp: ['#f2789f', '#a82657'],
  vaccine: ['#f6b93b', '#b96d06'],
  movement: ['#a08cf7', '#513dbe'],
  mind: ['#38cddb', '#0b6472'],
  exercise: ['#fb9134', '#bc440f'],
  screening: ['#5b83fb', '#1c339c'],
  hydration: ['#3ecbe0', '#2864c4'],
  feeding: ['#f89ab6', '#a83a70'],
  recovery: ['#54d3b0', '#16758f'],
  fertility: ['#a08cf7', '#b8479c'],
  clinic: ['#5b83fb', '#5f45c4'],
  child: ['#f6c453', '#dc5745'],
};

/** Square-ish artwork that sits to the left of a headline in the news feed. */
export function NewsThumb({ image, className }: { image: NewsImage; className?: string }) {
  const [from, to] = GRADIENT[image];
  return (
    <span
      aria-hidden
      className={cn('relative block overflow-hidden rounded-2xl ring-1 ring-black/5', className)}
      style={{ background: `linear-gradient(140deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* slice, not none: the scenes are drawn square and cropped to the tile
          rather than stretched into whatever shape the tile happens to be */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {SCENES[image]}
      </svg>
      {/* a soft vignette so white headline text beside it always has contrast */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
    </span>
  );
}
