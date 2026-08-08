import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Stethoscope, HeartHandshake } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { Reveal } from '@/components/ui/Reveal';
import { scaleIn } from '@/lib/motion';

export function CTASection() {
  const navigate = useNavigate();
  return (
    <section id="cta" className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal variants={scaleIn}>
          <div className="relative overflow-hidden rounded-4xl glass-strong px-8 py-16 text-center shadow-glass-lg sm:px-16">
            {/* inner glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-brand-300/40 blur-[90px]"
            />
