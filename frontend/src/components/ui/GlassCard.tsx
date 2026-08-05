import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  /** Adds pointer-hover elevation + subtle lift. */
  interactive?: boolean;
  /** Stronger frost for foreground surfaces. */
  strong?: boolean;
  /** Renders the hairline gradient ring. */
  ring?: boolean;
  glow?: boolean;
}

/**
 * The foundational liquid-glass surface. Rounded 28–32px, layered blue-tinted
 * shadow, optional gradient hairline and hover elevation.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, interactive, strong, ring = true, glow, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -6 } : undefined}
        transition={spring}
        className={cn(
          strong ? 'glass-strong' : 'glass',
          ring && 'ring-gradient',
          'rounded-3.5xl',
          interactive && 'cursor-pointer transition-shadow duration-500 hover:shadow-glass-lg',
          glow && 'shadow-glow',
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

GlassCard.displayName = 'GlassCard';
