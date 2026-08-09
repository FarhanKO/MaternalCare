import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT, type Accent } from './FloatingInput';

interface GlassSelectProps {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
  icon?: ReactNode;
  accent?: Accent;
}

/**
 * Custom select with a frosted "glass plate" options panel that pops/slides
 * down on open and up on close. Rendered in a portal so it is never clipped by
 * an ancestor's overflow. Replaces the un-animatable native <select>.
 */
export function GlassSelect({ label, options, value, onChange, icon, accent = 'brand' }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const a = ACCENT[accent];
  const openRing = accent === 'peach' ? 'border-peach-500 ring-4 ring-peach-500/15' : 'border-brand-500 ring-4 ring-brand-500/15';
  const selBg = accent === 'peach' ? 'bg-peach-500' : 'bg-brand-500';

  useEffect(() => {
    if (!open) return;
    const update = () => triggerRef.current && setRect(triggerRef.current.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

