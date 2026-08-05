import { motion } from 'framer-motion';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface LoaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { container: 'h-20 w-20', titleClass: 'text-sm/tight font-semibold', subtitleClass: 'text-xs/relaxed', spacing: 'space-y-2', maxWidth: 'max-w-48' },
  md: { container: 'h-32 w-32', titleClass: 'text-base/snug font-semibold', subtitleClass: 'text-sm/relaxed', spacing: 'space-y-3', maxWidth: 'max-w-56' },
  lg: { container: 'h-40 w-40', titleClass: 'text-lg/tight font-bold', subtitleClass: 'text-base/relaxed', spacing: 'space-y-4', maxWidth: 'max-w-64' },
};

/* brand-tinted conic rings */
const RINGS = [
  {
    gradient: 'conic-gradient(from 0deg, transparent 0deg, rgb(63,102,240) 90deg, transparent 180deg)',
    mask: 'radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)',
    opacity: 0.8, duration: 3, dir: 360, ease: 'linear' as const,
  },
  {
    gradient: 'conic-gradient(from 0deg, transparent 0deg, rgb(63,102,240) 120deg, rgba(91,131,251,0.5) 240deg, transparent 360deg)',
    mask: 'radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)',
    opacity: 0.9, duration: 2.5, dir: 360, ease: [0.4, 0, 0.6, 1] as const,
  },
  {
    gradient: 'conic-gradient(from 180deg, transparent 0deg, rgba(34,184,196,0.7) 45deg, transparent 90deg)',
    mask: 'radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)',
    opacity: 0.45, duration: 4, dir: -360, ease: [0.4, 0, 0.6, 1] as const,
  },
  {
    gradient: 'conic-gradient(from 270deg, transparent 0deg, rgba(91,131,251,0.5) 20deg, transparent 40deg)',
    mask: 'radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)',
    opacity: 0.55, duration: 3.5, dir: 360, ease: 'linear' as const,
  },
];

/**
 * Animated loading indicator — rotating gradient rings with a breathing title.
 * Adapted from the KokonutUI loader, re-skinned to the MaternalCare+ palette.
 */
export function Loader({
  title = 'Preparing your care space...',
  subtitle = 'Just a moment while we gather everything for you',
  size = 'md',
  className,
  ...props
}: LoaderProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-8 p-8', className)} {...props}>
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        className={cn('relative', config.container)}
        transition={{ duration: 4, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
      >
        {RINGS.map((ring, i) => (
          <motion.div
            key={i}
            animate={{ rotate: [0, ring.dir] }}
            className="absolute inset-0 rounded-full"
            style={{
              background: ring.gradient,
              mask: ring.mask,
              WebkitMask: ring.mask,
              opacity: ring.opacity,
            }}
            transition={{ duration: ring.duration, repeat: Infinity, ease: ring.ease }}
          />
        ))}
      </motion.div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn('text-center', config.spacing, config.maxWidth)}
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.4, duration: 1, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className={cn(config.titleClass, 'leading-[1.15] tracking-[-0.02em] text-ink antialiased')}
          initial={{ opacity: 0, y: 12 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.span
            animate={{ opacity: [0.9, 0.65, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
          >
            {title}
          </motion.span>
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className={cn(config.subtitleClass, 'font-medium leading-[1.45] tracking-[-0.01em] text-ink-muted antialiased')}
          initial={{ opacity: 0, y: 8 }}
          transition={{ delay: 0.8, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.span
            animate={{ opacity: [0.75, 0.5, 0.75] }}
            transition={{ duration: 4, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
          >
            {subtitle}
          </motion.span>
        </motion.p>
      </motion.div>
    </div>
  );
}

/** Full-screen loader used as the route-level Suspense fallback. */
export function PageLoader({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Loader size="lg" title={title} subtitle={subtitle} />
    </div>
  );
}

export default Loader;
