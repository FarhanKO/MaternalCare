import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface AITextLoadingProps {
  texts?: string[];
  className?: string;
  interval?: number;
}


