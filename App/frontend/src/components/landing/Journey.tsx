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
            {/*
              Each step is a column, so the card takes the space the icon
              leaves. `h-full` on the card measured the whole grid cell —
              including the 68px icon above it — so every card overhung its
              own cell by exactly the icon's height and sat on the next row.
            */}
            {journey.map((step, i) => (
              <motion.li key={step.title} variants={revealVariants} className="relative flex flex-col">
                <div className="mb-6 flex justify-center lg:justify-start">
                  <span className="relative grid h-[68px] w-[68px] place-items-center rounded-3xl glass-strong ring-gradient">
                    <step.icon className="h-6 w-6 text-brand-600" strokeWidth={2} />
                    <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white shadow-glow">
                      {i + 1}
                    </span>
                  </span>
                </div>
                <GlassCard className="flex-1 p-6 text-center lg:text-left" ring={false}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-500">{step.phase}</div>
                  <h3 className="mt-1.5 text-lg font-bold tracking-tight text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.description}</p>
                </GlassCard>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
