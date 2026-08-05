import type { Variants, Transition } from 'framer-motion';

/** Shared spring — the signature "premium" easing used across the app. */
export const spring: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 30,
  mass: 0.9,
};

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 140,
  damping: 24,
};

/** Scroll-reveal: nothing appears instantly — blur + fade + rise. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Stagger container for lists of revealed children. */
export const staggerContainer = (stagger = 0.09, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
