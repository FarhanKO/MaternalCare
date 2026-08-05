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

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={revealVariants}>
              <GlassCard interactive className="group h-full p-6">
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.accent} shadow-glow`}
                  >
                    <f.icon className="h-[22px] w-[22px] text-white" strokeWidth={2} />
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-ink-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-ink">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
