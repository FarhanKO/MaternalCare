import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface DockItem<T extends string> {
  key: T;
  label: string;
  icon: any;
  hint: string;
}

interface Props<T extends string> {
  items: DockItem<T>[];
  active: T;
  onChange: (key: T) => void;
  badges?: Partial<Record<T, number>>;
  /** gradient used for the active pill */
  accent?: 'brand' | 'peach';
  /** unique per dock instance so two docks never share a layout animation */
  layoutId?: string;
}

