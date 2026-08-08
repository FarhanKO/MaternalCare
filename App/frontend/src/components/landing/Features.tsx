import { motion } from 'framer-motion';
import { ArrowUpRight, Layers } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { features } from '@/data/landing';
import { staggerContainer, revealVariants } from '@/lib/motion';

export function Features() {
  return (
    <section id="features" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Everything in one place"
          icon={<Layers className="h-3.5 w-3.5" />}
          title={
            <>
              One platform for the
              <br className="hidden sm:block" /> whole journey
            </>
          }
          description="From the first week of pregnancy to your child's first steps — thoughtfully designed, quietly powerful."
        />


