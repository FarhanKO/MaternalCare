import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface AITextLoadingProps {
  texts?: string[];
  className?: string;
  interval?: number;
}


/**
 * Cycling status text with a shimmering gradient sweep.
 * Adapted from the KokonutUI AI text loader, re-skinned to the brand palette.
 */
export function AITextLoading({
  texts = ['Thinking...', 'Reading your symptoms...', 'Checking patterns...', 'Preparing guidance...', 'Almost there...'],
  className,
  interval = 1400,
}: AITextLoadingProps) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setI((p) => (p + 1) % texts.length), interval);
    return () => clearInterval(timer);
  }, [interval, texts.length]);

  return (
    <div className="flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative w-full px-2 py-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, backgroundPosition: ['200% center', '-200% center'] }}
            exit={{ opacity: 0, y: -16 }}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 0.3 },
              backgroundPosition: { duration: 2.5, ease: 'linear', repeat: Infinity },
            }}
            className={cn(
              'flex min-w-max justify-center whitespace-nowrap bg-gradient-to-r from-brand-700 via-brand-200 to-brand-700 bg-clip-text text-xl font-extrabold tracking-tight text-transparent',
              className,
            )}
            style={{ backgroundSize: '200% 100%' }}
          >
            {texts[i]}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default AITextLoading;
