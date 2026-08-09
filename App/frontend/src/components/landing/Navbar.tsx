import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

interface NavLink {
  label: string;
  href: string;
  route?: boolean;
}

const links: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#journey' },
  { label: 'Our story', href: '/about', route: true },
  { label: 'For clinicians', href: '#cta' },
];

