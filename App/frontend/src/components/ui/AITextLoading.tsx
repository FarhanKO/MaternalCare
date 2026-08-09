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

