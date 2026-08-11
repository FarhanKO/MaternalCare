import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: string;
  gradientId?: string;
}

