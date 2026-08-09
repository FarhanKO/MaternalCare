import { motion } from 'framer-motion';
import { Route } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { journey } from '@/data/landing';
import { staggerContainer, revealVariants } from '@/lib/motion';

export function Journey() {
  return (
    <section id="journey" className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="How it works"
          icon={<Route className="h-3.5 w-3.5" />}
          title="Four calm steps"
          description="No steep learning curve — just a quiet, guided path from first sign-in to connected care."
        />

        <div className="relative mt-16">
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-[34px] hidden h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent lg:block" />

          <motion.ol
            variants={staggerContainer(0.12)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
