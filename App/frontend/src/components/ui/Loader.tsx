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

