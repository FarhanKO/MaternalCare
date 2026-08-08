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
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-aqua-300/30 blur-[90px]"
            />

            <motion.span
              className="relative inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft"
            >
              <HeartHandshake className="h-3.5 w-3.5 text-brand-500" /> Built for mothers, trusted by clinicians
            </motion.span>

            <h2 className="relative mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
              Begin your care journey <span className="text-gradient">today</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-ink-soft">
              Join a calmer way to monitor pregnancy and child health — spacious, secure and quietly intelligent.
            </p>

            <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
              <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                Get started free
              </LiquidButton>
              <LiquidButton variant="glass" size="lg" onClick={() => navigate('/register')} icon={<Stethoscope className="h-[18px] w-[18px]" />}>
                For clinicians
              </LiquidButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
