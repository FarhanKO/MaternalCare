import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { HeroImageCarousel } from './HeroImageCarousel';
import { FlowingLines } from './FlowingLines';
import { staggerContainer, fadeUp } from '@/lib/motion';

export function Hero() {
  const navigate = useNavigate();
  return (
    <section id="top" className="relative px-3 pb-24 pt-24 sm:px-5">
      <div className="relative mx-auto max-w-[1380px]">
        <div className="relative min-h-[78vh] overflow-hidden rounded-[2rem] border border-white/50 shadow-glass-lg sm:min-h-[84vh]">
          {/* rotating photo fills the panel */}
          <HeroImageCarousel />


