import {
  Activity, Apple, Baby, Blocks, Brain, CircleDashed, Droplets, Footprints,
  HeartPulse, Milk, Moon, Stethoscope, Syringe, TestTube,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { NewsImage } from '@/data/reading';

type Motif = 'rings' | 'wave' | 'bars' | 'dots' | 'arc';

/**
 * Each story's artwork. Drawn rather than photographed — the app ships no image
 * assets and cannot reach a CDN, so the thumbnails are generated from the same
 * palette as the rest of the dashboard.
 */
const ART: Record<NewsImage, { from: string; to: string; icon: typeof Moon; motif: Motif }> = {
  sleep: { from: '#5b83fb', to: '#2b2f7a', icon: Moon, motif: 'dots' },
  nutrition: { from: '#3fd1a8', to: '#11836b', icon: Apple, motif: 'arc' },
  bp: { from: '#f2789f', to: '#b52e60', icon: HeartPulse, motif: 'wave' },
  vaccine: { from: '#f6b93b', to: '#c47a08', icon: Syringe, motif: 'rings' },
  movement: { from: '#a08cf7', to: '#5b45c9', icon: Baby, motif: 'rings' },
  mind: { from: '#38cddb', to: '#0d6f7c', icon: Brain, motif: 'dots' },
  exercise: { from: '#fb9134', to: '#c94d13', icon: Activity, motif: 'wave' },
  screening: { from: '#5b83fb', to: '#2039a8', icon: TestTube, motif: 'bars' },
  hydration: { from: '#3ecbe0', to: '#2f6fd0', icon: Droplets, motif: 'wave' },
  feeding: { from: '#f89ab6', to: '#b5417a', icon: Milk, motif: 'arc' },
  recovery: { from: '#54d3b0', to: '#1a7f9b', icon: Footprints, motif: 'bars' },
  fertility: { from: '#a08cf7', to: '#c052a8', icon: CircleDashed, motif: 'rings' },
  clinic: { from: '#5b83fb', to: '#6a4fd0', icon: Stethoscope, motif: 'arc' },
  child: { from: '#f6c453', to: '#e5624d', icon: Blocks, motif: 'dots' },
};

/** Decorative geometry so neighbouring thumbnails stay distinguishable. */
function Motif({ motif }: { motif: Motif }) {
  switch (motif) {
    case 'rings':
      return (
        <g fill="none" stroke="#fff" strokeOpacity="0.28">
          <circle cx="76" cy="24" r="14" />
          <circle cx="76" cy="24" r="26" />
          <circle cx="76" cy="24" r="38" />
        </g>
      );
    case 'wave':
      return (
        <g fill="#fff">
          <path d="M0 66 Q25 46 50 64 T100 54 V100 H0 Z" fillOpacity="0.16" />
          <path d="M0 82 Q28 64 52 80 T100 72 V100 H0 Z" fillOpacity="0.14" />
        </g>
      );
    case 'bars':
      return (
        <g fill="#fff" fillOpacity="0.2">
          <rect x="12" y="62" width="12" height="38" rx="4" />
          <rect x="32" y="48" width="12" height="52" rx="4" />
          <rect x="52" y="70" width="12" height="30" rx="4" />
          <rect x="72" y="38" width="12" height="62" rx="4" />
        </g>
      );
    case 'dots':
      return (
        <g fill="#fff" fillOpacity="0.22">
          {[16, 38, 60, 82].map((y) =>
            [14, 36, 58, 80].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />),
          )}
        </g>
      );
    default:
      return (
        <g fill="#fff">
          <path d="M0 100 A70 70 0 0 1 70 30 V100 Z" fillOpacity="0.15" />
          <circle cx="80" cy="20" r="16" fillOpacity="0.2" />
        </g>
      );
  }
}

/** Square-ish artwork that sits to the left of a headline in the news feed. */
export function NewsThumb({ image, className }: { image: NewsImage; className?: string }) {
  const art = ART[image];
  const Icon = art.icon;
  return (
    <span
      aria-hidden
      className={cn('relative block overflow-hidden rounded-2xl ring-1 ring-black/5', className)}
      style={{ background: `linear-gradient(140deg, ${art.from} 0%, ${art.to} 100%)` }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <Motif motif={art.motif} />
      </svg>
      <Icon
        className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        strokeWidth={1.9}
      />
    </span>
  );
}
