import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { revealVariants } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
  once?: boolean;
  as?: 'div' | 'section' | 'li' | 'span';
}

/**
 * Scroll-reveal wrapper. Content animates in with a blur+fade+rise as it
 * enters the viewport — nothing appears instantly.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variants = revealVariants,
  once = true,
  as = 'div',
}: RevealProps) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-80px' }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
