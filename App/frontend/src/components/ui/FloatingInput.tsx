import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export type Accent = 'brand' | 'peach';

export const ACCENT: Record<Accent, { focus: string; label: string; labelFocus: string }> = {
  brand: {
    focus: 'focus:border-brand-500 focus:ring-brand-500/15',
    label: 'text-brand-600',
    labelFocus: 'peer-focus:text-brand-600',
  },
  peach: {
    focus: 'focus:border-peach-500 focus:ring-peach-500/15',
    label: 'text-peach-600',
    labelFocus: 'peer-focus:text-peach-600',
  },
};

