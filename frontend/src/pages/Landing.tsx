import { motion, useScroll, useSpring } from 'framer-motion';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { TrustBar } from '@/components/landing/TrustBar';
import { CareStages } from '@/components/landing/CareStages';
import { Features } from '@/components/landing/Features';
import { Showcase } from '@/components/landing/Showcase';
import { Journey } from '@/components/landing/Journey';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';
import { Reveal } from '@/components/ui/Reveal';

export function Landing() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <>
      {/* scroll progress indicator */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-aqua-500"
      />

      <Navbar />

      <main>
        <Hero />
        <TrustBar />
        <CareStages />
        <Features />
        <Showcase />
        <Journey />
        <CTASection />

        {/* closing statement */}
        <section className="px-4 pb-20 pt-2 text-center">
          <Reveal>
            <p className="mx-auto max-w-3xl font-serif text-2xl italic leading-snug text-ink-soft sm:text-[2rem]">
              Every mother deserves the <span className="text-gradient">best care</span>. Every
              child deserves the <span className="text-gradient">best start</span>.
            </p>
          </Reveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
