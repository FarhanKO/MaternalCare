import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { Badge } from '@/components/ui/Badge';
import { careStages } from '@/data/landing';
import { staggerContainer, revealVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';

/** How much wider the open panel gets than its resting siblings. */
const GROWN = 1.9;

/**
 * The row only behaves as an accordion where there is room for it and a real
 * pointer to drive it. Below `lg` the panels are a plain grid, so a tap meant
 * to follow the link never gets swallowed by an expand.
 */
const canExpand = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

/**
 * Care stages — four photo panels that expand under the cursor.
 *
 * The open panel takes its width from its siblings rather than from the page,
 * so the row never reflows the section around it. The description is revealed
 * by animating a grid row from 0fr to 1fr, which lets the paragraph keep its
 * natural height instead of being clipped at a guessed max-height.
 */
export function CareStages() {
  const [active, setActive] = useState<number | null>(null);

  const open = (i: number) => {
    if (canExpand()) setActive(i);
  };

  return (
    <section id="stages" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Reveal className="flex justify-center">
            <Badge icon={<Sparkles className="h-3.5 w-3.5" />}>Every stage of the journey</Badge>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-[2.75rem]">
              Care that grows{' '}
              <span className="font-serif text-[1.1em] font-medium italic text-gradient">
                with your family
              </span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
              From the first weeks of pregnancy to your child&rsquo;s first steps — one record that
              carries forward, so nobody looking after you has to start from scratch.
            </p>
          </Reveal>
        </div>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          onMouseLeave={() => setActive(null)}
          className="grid gap-4 sm:grid-cols-2 lg:flex lg:h-[30rem] lg:gap-5"
        >
          {careStages.map((stage, i) => {
            const isOpen = active === i;
            const dimmed = active !== null && !isOpen;

            return (
              <motion.div
                key={stage.title.join(' ')}
                variants={revealVariants}
                style={{ flexGrow: isOpen ? GROWN : 1 }}
                className={cn(
                  'min-w-0 lg:basis-0',
                  // the widen itself — siblings give up the space, the row does not grow
                  'lg:transition-[flex-grow] lg:duration-[600ms] lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'motion-reduce:transition-none',
                )}
              >
                <Link
                  to="/register"
                  onMouseEnter={() => open(i)}
                  onFocus={() => open(i)}
                  className={cn(
                    'group relative block h-[20rem] overflow-hidden rounded-3xl shadow-soft ring-1 ring-white/10 lg:h-full',
                    'transition-[transform,opacity,filter,box-shadow] duration-500 ease-out motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                    isOpen && 'z-10 lg:scale-[1.055] lg:shadow-glass-lg',
                    dimmed && 'lg:scale-[0.975] lg:opacity-80 lg:brightness-[0.78]',
                  )}
                >
                  <img
                    src={stage.image}
                    alt=""
                    loading="lazy"
                    className={cn(
                      'absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out motion-reduce:transition-none',
                      isOpen ? 'lg:scale-105' : 'lg:scale-100',
                    )}
                  />

                  {/*
                    Keeps the copy legible over whatever part of the photo lands
                    behind it. The ramp is weighted low but held above 50% to
                    nearly half height, because the open panel — and every panel
                    on a phone — pushes its description that far up, and two of
                    these photos are almost white.
                  */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08111f]/[0.94] from-10% via-[#08111f]/65 via-50% to-[#08111f]/10" />

                  <span className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
                    <span className={cn('h-2.5 w-2.5 rounded-full', stage.dot)} />
                  </span>

                  <ArrowUpRight
                    className={cn(
                      'absolute right-5 top-6 h-5 w-5 text-white/70 transition-all duration-300 motion-reduce:transition-none',
                      'group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white',
                      'lg:opacity-0',
                      isOpen && 'lg:opacity-100',
                    )}
                  />

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <h3 className="text-[1.35rem] font-bold leading-[1.15] tracking-tight text-white">
                      {stage.title[0]}
                      <br />
                      {stage.title[1]}
                    </h3>
                    <p className="mt-1.5 text-[13px] font-semibold tracking-wide text-white/70">
                      {stage.meta}
                    </p>

                    {/* 0fr → 1fr, so the paragraph animates at its own height */}
                    <div
                      className={cn(
                        'grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none',
                        'grid-rows-[1fr] opacity-100 lg:grid-rows-[0fr] lg:opacity-0',
                        isOpen && 'lg:grid-rows-[1fr] lg:opacity-100',
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/85">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
