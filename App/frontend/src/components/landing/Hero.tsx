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

          {/* copy overlaid on the left */}
          <div className="relative z-20 flex min-h-[78vh] items-center sm:min-h-[84vh]">
            <motion.div
              variants={staggerContainer(0.12)}
              initial="hidden"
              animate="visible"
              className="max-w-2xl px-7 py-24 text-left sm:px-14"
            >
              <motion.h1
                variants={fadeUp}
                className="text-balance text-[2.2rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl md:text-[3.6rem]"
              >
                A{' '}
                <span
                  className="bg-clip-text font-serif text-[1.12em] font-medium italic text-transparent"
                  style={{ backgroundImage: 'linear-gradient(120deg,#8ef0ea 0%,#a8c6ff 45%,#ffffff 100%)' }}
                >
                  Healthier Start
                </span>{' '}
                for Every Family
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-xl font-serif text-xl italic leading-relaxed text-white/90 sm:text-2xl"
              >
                A platform dedicated to every mother’s journey — from pregnancy care to a
                child’s healthy growth
              </motion.p>

              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-3">
                <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                  Start monitoring
                </LiquidButton>
                <LiquidButton variant="glass" size="lg" icon={<Play className="h-[16px] w-[16px] fill-current" />}>
                  Watch the tour
                </LiquidButton>
              </motion.div>
            </motion.div>
          </div>

          {/* animated flowing lines woven across the bottom of the image */}
          <FlowingLines className="absolute inset-x-0 bottom-0 z-10 h-36 opacity-90" />
        </div>
      </div>
    </section>
  );
}
