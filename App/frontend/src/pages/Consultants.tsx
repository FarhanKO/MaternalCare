import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, BadgeCheck, CalendarDays, ClipboardList, FolderOpen, Inbox,
  LayoutDashboard, ListChecks, Lock, Receipt, ShieldAlert, Stethoscope, Users,
  type LucideIcon,
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import type { RankedDoctor } from '@/data/care';
import { taka } from '@/data/care';
import { revealVariants, staggerContainer } from '@/lib/motion';

/**
 * The page for clinicians deciding whether to take patients here.
 *
 * The panel band is read from the live doctors endpoint rather than written
 * into the file, so it cannot drift: if a clinician joins, the count and the
 * specialty list on this page move with them. Everything else describes
 * features that exist — there are no outcome claims and no testimonials,
 * because we have neither.
 */

/** What a clinician actually runs into, that this is meant to fix. */
const FRICTION: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FolderOpen,
    title: 'She arrives with nothing written down',
    body:
      'Ten minutes of the consultation goes on reconstructing a history from memory and a plastic bag of paper. Here it is already on the record, dated, before you open the door.',
  },
  {
    icon: Activity,
    title: 'A single reading tells you nothing',
    body:
      'One blood pressure is a number; eight weekly readings are a trend. The chart is drawn from what she logged, and the tier beside it shows the readings behind it.',
  },
  {
    icon: Receipt,
    title: 'Diary and money in different places',
    body:
      'Bookings, the fee and whether it was paid are one record. You are not chasing a receptionist to find out whether a slot is real.',
  },
];

/** The clinician portal's real tabs — nothing here is aspirational. */
const PORTAL: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: LayoutDashboard,
    title: 'Overview',
    body: 'Caseload, how many are high risk, today’s appointments and open alerts — each one opens the list it is counting.',
    tone: 'from-brand-400 to-brand-600',
  },
  {
    icon: Users,
    title: 'Patients',
    body: 'Every mother under your care with her gestational week, blood pressure trend, active flags and a risk tier you can overrule.',
    tone: 'from-aqua-400 to-brand-500',
  },
  {
    icon: CalendarDays,
    title: 'Schedule',
    body: 'Your consulting slots for the day, who is booked into them, and who is still waiting to be seen.',
    tone: 'from-brand-500 to-brand-700',
  },
  {
    icon: Inbox,
    title: 'Inbox',
    body: 'Requests to be seen, and the message threads that ride along with a month-of-chat booking.',
    tone: 'from-brand-400 to-aqua-500',
  },
  {
    icon: FolderOpen,
    title: 'Files',
    body: 'Her prescriptions and results on a dated timeline — hers and the ones you file — each opening full size.',
    tone: 'from-peach-400 to-peach-600',
  },
  {
    icon: ShieldAlert,
    title: 'Alerts & SOS',
    body: 'Readings that cross a threshold raise themselves, and an emergency press reaches you at the same moment it reaches her family.',
    tone: 'from-rose-400 to-rose-600',
  },
];

/** The published fee rules, exactly as doctorModel computes them. */
const FEE_RULES: { label: string; value: string }[] = [
  { label: 'Base consultation', value: taka(400) },
  { label: 'Fellowship — FCPS, MRCOG, FRCOG', value: `+ ${taka(350)}` },
  { label: 'Doctorate or membership — MD, MS, MRCPCH', value: `+ ${taka(200)}` },
  { label: 'Diploma — DGO, DCH, MPH', value: `+ ${taka(100)}` },
  { label: 'Each year practised, capped at 20', value: `+ ${taka(15)}` },
  { label: 'Rounded to the nearest', value: taka(50) },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Send your registration',
    body: 'Your name, specialty, qualifications, years in practice and your licence number. No institution to name — you consult through this platform, not from a building we list.',
  },
  {
    n: '02',
    title: 'We set your fee and your capacity',
    body: 'The fee comes off the published rules below — no negotiation, and no clinician quietly priced above another with the same letters.',
  },
  {
    n: '03',
    title: 'Your diary opens',
    body: 'You appear in every mother’s list straight away, ranked on what you are qualified in, how much room your list has left, how fast you answer and how you are rated. There are no filters for her to fall out of — everyone is placed, and each card says why.',
  },
];

const TRUST: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Lock,
    title: 'You see your own caseload',
    body: 'Not the whole database. Access follows the patients who are actually yours.',
  },
  {
    icon: ListChecks,
    title: 'The model shows its working',
    body: 'A risk tier always displays the readings that produced it, so you can disagree with it in one look.',
  },
  {
    icon: BadgeCheck,
    title: 'No patient can cold-call you',
    body: 'Calls happen on a link you issue, after an appointment exists. She cannot send one from the chat.',
  },
];

interface Panel {
  count: number;
  specialties: string[];
  minFee: number;
  maxFee: number;
}

/** How many faces the grid shows before "see all" takes over. */
const SHOWN = 8;

const initialsOf = (name: string) =>
  name.replace(/^Dr\.?\s+/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** A stable tint per clinician, so the grid is not one flat colour. */
const TINTS = [
  'from-brand-400 to-brand-600',
  'from-aqua-400 to-brand-500',
  'from-brand-500 to-brand-700',
  'from-peach-400 to-peach-600',
];

export function Consultants() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [roster, setRoster] = useState<RankedDoctor[]>([]);

  // the band below is the live panel; if it cannot be read, it is simply absent
  useEffect(() => {
    let cancelled = false;
    api.getDoctors()
      .then((list) => {
        if (cancelled || !list.length) return;
        setRoster(list);
        const fees = list.map((d) => d.feeBdt).filter((f) => typeof f === 'number');
        setPanel({
          count: list.length,
          specialties: [...new Set(list.map((d) => d.specialty).filter(Boolean))] as string[],
          minFee: Math.min(...fees),
          maxFee: Math.max(...fees),
        });
      })
      .catch(() => { /* the band just does not render */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Navbar />
      <main>
        {/* hero */}
        <section className="px-4 pt-24 sm:pt-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
              <div>
                <Reveal>
                  <Badge icon={<Stethoscope className="h-3.5 w-3.5" />}>For consultants</Badge>
                </Reveal>
                <Reveal delay={0.05}>
                  <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                    Take the consultation.{' '}
                    <span className="font-serif italic font-medium text-brand-600">We’ll take the paperwork</span>
                  </h1>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                    Every mother who reaches you arrives with her history already written down — weeks of
                    vitals, what she logged, every prescription and result on a dated timeline. You open the
                    record and start where the medicine starts.
                  </p>
                </Reveal>
                <Reveal delay={0.15}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                      Join the panel
                    </LiquidButton>
                    <LiquidButton size="lg" variant="glass" onClick={() => navigate('/doctor')}>
                      Look round the portal
                    </LiquidButton>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.1}>
                <div className="relative overflow-hidden rounded-4xl border border-white/50 shadow-glass">
                  <img
                    src="/hero/doctor2.jpg"
                    alt="A clinician talking a couple through their notes"
                    className="h-[22rem] w-full object-cover sm:h-[26rem]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 backdrop-blur-xl">
                    <div className="text-[13px] font-bold leading-none text-white">Her file is already open</div>
                    <div className="mt-1.5 text-[11.5px] font-medium text-white/80">
                      Vitals, symptoms, scans — before she sits down
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* the live panel */}
        {panel && (
          <section className="px-4 pt-14">
            <div className="mx-auto max-w-6xl">
              <Reveal>
                <GlassCard strong className="p-7 sm:p-8">
                  <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
                    <div className="flex gap-8">
                      <div>
                        <div className="text-4xl font-extrabold tracking-tight text-gradient">{panel.count}</div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                          on the panel
                        </div>
                      </div>
                      <div>
                        <div className="text-4xl font-extrabold tracking-tight text-gradient">
                          {taka(panel.minFee)}–{panel.maxFee}
                        </div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                          fee range today
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                        Specialties already covered
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {panel.specialties.map((s) => (
                          <span key={s} className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-[12px] font-semibold text-ink-soft">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Reveal>
              <Reveal delay={0.05}>
                <p className="mt-3 text-center text-[12px] font-medium text-ink-faint">
                  Read live from the panel — this is the roster as it stands right now.
                </p>
              </Reveal>
            </div>
          </section>
        )}

        {/* the people */}
        {roster.length > 0 && (
          <section className="px-4 pt-16 sm:pt-20">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <Reveal>
                    <Badge icon={<Users className="h-3.5 w-3.5" />}>The panel</Badge>
                  </Reveal>
                  <Reveal delay={0.05}>
                    <h2 className="mt-4 text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-4xl">
                      The clinicians already{' '}
                      <span className="font-serif italic font-medium text-brand-600">taking patients</span>
                    </h2>
                  </Reveal>
                </div>
                <Reveal delay={0.1}>
                  <button
                    onClick={() => navigate('/appoint')}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-[13px] font-bold text-brand-700 shadow-soft backdrop-blur-md transition hover:bg-white"
                  >
                    See all consultants <ArrowRight className="h-4 w-4" />
                  </button>
                </Reveal>
              </div>

              <motion.div
                variants={staggerContainer(0.06)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
              >
                {roster.slice(0, SHOWN).map((d, i) => (
                  <motion.div key={d.id} variants={revealVariants} className="text-center">
                    <span className="relative mx-auto block h-[104px] w-[104px]">
                      <span className={`grid h-full w-full place-items-center rounded-full bg-gradient-to-br ${TINTS[i % TINTS.length]} text-2xl font-extrabold text-white shadow-glow`}>
                        {initialsOf(d.name)}
                      </span>
                      {/* honest about who is actually taking bookings, and why not */}
                      {d.status !== 'open' && (
                        <span className="absolute inset-x-0 -bottom-1 mx-auto w-fit rounded-full border border-white/70 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint shadow-soft">
                          {d.status === 'away' ? 'On leave' : 'List full'}
                        </span>
                      )}
                    </span>
                    <div className="mt-4 text-[15px] font-extrabold tracking-tight text-brand-700">{d.name}</div>
                    <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-muted">
                      {d.specialty}
                    </div>
                    <div className="mt-1 text-[11px] font-medium leading-snug text-ink-faint">
                      {d.qualification}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* what it fixes */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Why bother"
              icon={<Activity className="h-3.5 w-3.5" />}
              title={<>Three things that waste<br className="hidden sm:block" /> a consultation</>}
              description="None of them are clinical. All of them are the reason the clinical part starts late."
            />
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-14 grid gap-5 md:grid-cols-3"
            >
              {FRICTION.map((f) => (
                <motion.div key={f.title} variants={revealVariants}>
                  <GlassCard float className="h-full p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-peach-100/70">
                      <f.icon className="h-5 w-5 text-peach-600" strokeWidth={2} />
                    </span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">{f.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.body}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* the portal */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Your side of it"
              icon={<LayoutDashboard className="h-3.5 w-3.5" />}
              title="Six screens, and nothing you have to learn"
            />
            <motion.div
              variants={staggerContainer(0.07)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {PORTAL.map((p) => (
                <motion.div key={p.title} variants={revealVariants}>
                  <GlassCard float className="h-full p-6">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.tone} shadow-glow`}>
                      <p.icon className="h-[22px] w-[22px] text-white" strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 text-lg font-bold tracking-tight text-ink">{p.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* the fee, in the open */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-16">
              <div>
                <Reveal>
                  <Badge icon={<Receipt className="h-3.5 w-3.5" />}>What you are paid</Badge>
                </Reveal>
                <Reveal delay={0.05}>
                  <h2 className="mt-5 text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-4xl">
                    The fee is a formula, not a negotiation
                  </h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                    Your consultation fee is computed from your qualifications and years in practice — the
                    same two things the ranking reads. It is not a number someone typed in and forgot, and
                    two clinicians with the same letters and the same experience are never priced apart.
                  </p>
                </Reveal>
                <Reveal delay={0.15}>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                    A month of chat access, if she buys it, adds 60% of your visit fee — deliberately well
                    under a second consultation, so she asks the small question instead of saving it up.
                  </p>
                </Reveal>
              </div>

              <Reveal delay={0.1}>
                <GlassCard strong className="overflow-hidden p-2">
                  <ul className="divide-y divide-white/60">
                    {FEE_RULES.map((r) => (
                      <li key={r.label} className="flex items-center justify-between gap-4 px-4 py-3.5">
                        <span className="text-[14px] font-semibold text-ink-soft">{r.label}</span>
                        <span className="flex-none text-[14px] font-extrabold tabular-nums text-ink">{r.value}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="m-2 rounded-2xl bg-brand-50/80 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                      Worked example
                    </div>
                    <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-ink-soft">
                      MBBS, MRCOG, MD · 15 years → {taka(400)} + {taka(350)} + {taka(15)}×15
                      = <span className="font-extrabold text-ink">{taka(1000)}</span> a visit,
                      and {taka(600)} for a month of chat.
                    </p>
                  </div>
                </GlassCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* joining */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Joining"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              title="Three steps, and your diary is live"
            />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={0.05 * i}>
                  <GlassCard float className="h-full p-6">
                    <span className="font-serif text-4xl italic leading-none text-brand-300">{s.n}</span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">{s.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* what we will not do to you */}
        <section className="px-4 pb-8">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
            {TRUST.map((t, i) => (
              <Reveal key={t.title} delay={0.05 * i}>
                <div className="h-full rounded-3xl border border-white/60 bg-white/55 p-6 shadow-soft backdrop-blur-md">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-aqua-400/15">
                    <t.icon className="h-5 w-5 text-aqua-600" strokeWidth={2} />
                  </span>
                  <div className="mt-4 text-lg font-bold text-ink">{t.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* closing */}
        <section className="px-4 py-20 text-center sm:py-24">
          <Reveal>
            <p className="mx-auto max-w-3xl text-balance font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
              Your judgement, better informed.{' '}
              <span className="text-gradient not-italic">Nothing more than that.</span>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                Join the panel
              </LiquidButton>
              <LiquidButton size="lg" variant="glass" onClick={() => navigate('/contact')}>
                Ask us something first
              </LiquidButton>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
