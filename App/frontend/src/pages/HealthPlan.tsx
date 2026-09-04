import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Baby,
  BrainCircuit,
  Building2,
  CalendarHeart,
  ClipboardList,
  FileWarning,
  HandHeart,
  Landmark,
  Layers,
  LineChart,
  Lock,
  MapPinOff,
  MessageSquare,
  Radar,
  ShieldCheck,
  Siren,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { Reveal } from '@/components/ui/Reveal';
import { features } from '@/data/landing';
import { revealVariants, staggerContainer } from '@/lib/motion';

/**
 * The buyer-facing page for organisations that fund care rather than receive
 * it — employers, clinic networks and public-health programmes.
 *
 * Every claim on this page maps to something the platform actually ships. The
 * figures in FACTS describe the product (how many risk tiers, how many weeks,
 * how many billing plans), never member outcomes — we have no outcome data
 * yet, so none is implied.
 */

/** What goes wrong today, in the words of the people it happens to. */
const GAPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileWarning,
    title: 'Records live in a plastic bag',
    body:
      'Reports, prescriptions and scan results are carried from clinic to clinic on paper. Whoever sees the mother next starts from almost nothing.',
  },
  {
    icon: Radar,
    title: 'Warning signs go unread',
    body:
      'A rising blood pressure only means something next to the readings before it. On paper, that trend simply does not exist.',
  },
  {
    icon: MapPinOff,
    title: 'The nearest specialist is far',
    body:
      'Finding an obstetrician who is available, affordable and reachable is its own job — one that usually falls on the family at the worst moment.',
  },
  {
    icon: HandHeart,
    title: 'Support stops at the clinic door',
    body:
      'Between visits there is nobody to ask. Questions wait weeks, or turn into an emergency that could have been a message.',
  },
];

/** True statements about the product — not outcome claims. */
const FACTS: { value: string; label: string; note: string }[] = [
  { value: '3', label: 'risk tiers', note: 'Low, medium and high — scored and explained, never a black box.' },
  { value: '40', label: 'weeks tracked', note: 'Gestational age and development worked out from her own history.' },
  { value: '2', label: 'consultation plans', note: 'A single video visit, or a visit plus a month of chat access.' },
  { value: '24/7', label: 'emergency reach', note: 'One press alerts her guardians and her clinicians, with location.' },
];

/** How the same platform is bought by three different kinds of organisation. */
const MODELS: { icon: LucideIcon; title: string; blurb: string; points: string[] }[] = [
  {
    icon: Building2,
    title: 'Employers',
    blurb: 'A maternity benefit staff actually open.',
    points: [
      'Enrol expecting employees and their families',
      'Consultations covered at a fixed, published fee',
      'Nothing clinical ever reaches the employer',
    ],
  },
  {
    icon: Stethoscope,
    title: 'Clinics & care networks',
    blurb: 'Your clinicians, our rails.',
    points: [
      'Your doctors get a caseload view, not another inbox',
      'Bookings and payments land in one schedule',
      'Patients arrive with history already written down',
    ],
  },
  {
    icon: Landmark,
    title: 'Public health & NGOs',
    blurb: 'Reach that does not depend on a building.',
    points: [
      'Field workers register mothers on a phone',
      'Risk tiers show where limited clinician time should go',
      'Guardian app extends the safety net to the household',
    ],
  },
];

/** The four things the platform does, stated as capabilities. */
const PILLARS: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: BrainCircuit,
    title: 'Risk awareness',
    body:
      'Every pregnancy carries a low, medium or high tier derived from vitals, history and logged symptoms — with the reasoning shown, so a clinician can disagree with it.',
    tone: 'from-brand-500 to-brand-700',
  },
  {
    icon: CalendarHeart,
    title: 'Care navigation',
    body:
      'Mothers either browse clinicians themselves or let Auto Assign rank them by fit, availability and fee. Either way the visit is booked and paid for in one pass.',
    tone: 'from-aqua-400 to-brand-600',
  },
  {
    icon: MessageSquare,
    title: 'Contact between visits',
    body:
      'A month of chat access can ride along with a consultation — images from gallery or camera, and a meeting link the doctor issues when a call is actually warranted.',
    tone: 'from-brand-400 to-aqua-500',
  },
  {
    icon: Siren,
    title: 'A household safety net',
    body:
      'The guardian app puts one SOS press in front of the family beside her — with her location attached and instructions for what to do while help is on the way.',
    tone: 'from-peach-400 to-peach-600',
  },
];

/** What the clinician portal already computes — the reporting surface. */
const REPORTING = [
  { icon: Users, label: 'Active pregnancies under care' },
  { icon: ShieldCheck, label: 'How many sit in each risk tier' },
  { icon: CalendarHeart, label: 'Appointments booked, seen and missed' },
  { icon: Siren, label: 'Open alerts, and how long they stayed open' },
  { icon: LineChart, label: 'Vitals trends across the caseload' },
  { icon: ClipboardList, label: 'Immunisation and reminder adherence' },
];

const GOVERNANCE = [
  { icon: Lock, title: 'Private by design', body: 'Clinical detail is visible to the mother and her care team. Never to the organisation paying the bill.' },
  { icon: ShieldCheck, title: 'Role-separated access', body: 'Mother, clinician and guardian each see a different application. Access follows the role, not the account.' },
  { icon: ClipboardList, title: 'Explainable, not oracular', body: 'Every risk tier shows the readings behind it, so a clinician can overrule the model with one look.' },
];

export function HealthPlan() {
  const navigate = useNavigate();

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
                  <Badge icon={<Layers className="h-3.5 w-3.5" />}>For health plans &amp; employers</Badge>
                </Reveal>
                <Reveal delay={0.05}>
                  <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                    Maternal care your members can{' '}
                    <span className="font-serif italic font-medium text-brand-600">actually reach</span>
                  </h1>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                    MaternalCare+ gives every enrolled mother a tracked pregnancy, a risk tier her clinician
                    can read, and a doctor she can reach — while giving you a picture of the population you
                    are covering, without ever exposing what any one mother told her doctor.
                  </p>
                </Reveal>
                <Reveal delay={0.15}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                      Book a walkthrough
                    </LiquidButton>
                    <LiquidButton size="lg" variant="glass" onClick={() => navigate('/about')}>
                      Why we built it
                    </LiquidButton>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.1}>
                <div className="relative overflow-hidden rounded-4xl border border-white/50 shadow-glass">
                  <img
                    src="/hero/slide2.jpg"
                    alt="A mother holding her newborn"
                    className="h-[22rem] w-full object-cover sm:h-[26rem]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 backdrop-blur-xl">
                    <div className="text-[13px] font-bold leading-none text-white">One record, every visit</div>
                    <div className="mt-1.5 text-[11.5px] font-medium text-white/80">
                      Whoever sees her next opens the same history
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* the gap */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="The gap you are paying for"
              icon={<FileWarning className="h-3.5 w-3.5" />}
              title={<>Most maternity spend arrives<br className="hidden sm:block" /> after something went wrong</>}
              description="Not because anyone is careless — because the information needed to act earlier was never in one place."
            />
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-14 grid gap-5 sm:grid-cols-2"
            >
              {GAPS.map((g) => (
                <motion.div key={g.title} variants={revealVariants}>
                  <GlassCard float className="h-full p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-peach-100/70">
                      <g.icon className="h-5 w-5 text-peach-600" strokeWidth={2} />
                    </span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">{g.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{g.body}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* product facts — deliberately about the platform, not outcomes */}
        <section className="px-4 pb-4">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <GlassCard strong className="grid gap-6 p-8 sm:grid-cols-2 lg:grid-cols-4">
                {FACTS.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight text-gradient">{f.value}</span>
                      <span className="text-sm font-bold text-ink-soft">{f.label}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{f.note}</p>
                  </div>
                ))}
              </GlassCard>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="mt-3 text-center text-[12px] font-medium text-ink-faint">
                These describe what the platform does. We publish no outcome figures we have not measured.
              </p>
            </Reveal>
          </div>
        </section>

        {/* what members get — the real feature set */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="What every enrolled member gets"
              icon={<Baby className="h-3.5 w-3.5" />}
              title={<>One programme, the<br className="hidden sm:block" /> whole journey</>}
              description="From the first missed period to the last childhood vaccine — the same account, the same record, the same care team."
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
                  <GlassCard float className="h-full p-6">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.accent} shadow-glow`}>
                      <f.icon className="h-[22px] w-[22px] text-white" strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 text-lg font-bold tracking-tight text-ink">{f.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* how it fits three kinds of organisation */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="How it fits"
              icon={<Building2 className="h-3.5 w-3.5" />}
              title="Three ways organisations buy it"
              description="The mother's experience is identical in all three. What changes is who enrols her and who settles the fee."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {MODELS.map((m, i) => (
                <Reveal key={m.title} delay={0.05 * i}>
                  <GlassCard float className="flex h-full flex-col p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 ring-1 ring-brand-200/70">
                      <m.icon className="h-5 w-5 text-brand-600" strokeWidth={2} />
                    </span>
                    <h3 className="mt-4 min-h-[1.75rem] text-lg font-bold tracking-tight text-ink">{m.title}</h3>
                    <p className="mt-1.5 min-h-[3rem] text-[15px] font-semibold leading-relaxed text-brand-600">{m.blurb}</p>
                    <ul className="mt-4 space-y-2.5 border-t border-white/60 pt-4">
                      {m.points.map((p) => (
                        <li key={p} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-soft">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brand-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* the four pillars */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="How the care actually works"
              icon={<BrainCircuit className="h-3.5 w-3.5" />}
              title="Four things running under every enrolment"
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {PILLARS.map((p, i) => (
                <Reveal key={p.title} delay={0.05 * i}>
                  <GlassCard float className="h-full p-7">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.tone} shadow-glow`}>
                      <p.icon className="h-[22px] w-[22px] text-white" strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 text-xl font-bold tracking-tight text-ink">{p.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* reporting */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16">
              <div>
                <Reveal>
                  <Badge icon={<LineChart className="h-3.5 w-3.5" />}>What you can see</Badge>
                </Reveal>
                <Reveal delay={0.05}>
                  <h2 className="mt-5 text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-4xl">
                    Population numbers, not private conversations
                  </h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                    The clinician portal already computes these for the caseload it manages. A plan sees them
                    rolled up — how many mothers, in which tiers, being seen how often. It never sees a
                    symptom log, a chat thread or a note.
                  </p>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <GlassCard strong className="p-3">
                  <ul className="divide-y divide-white/60">
                    {REPORTING.map((r) => (
                      <li key={r.label} className="flex items-center gap-3.5 px-4 py-3.5">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand-50 ring-1 ring-brand-200/60">
                          <r.icon className="h-4 w-4 text-brand-600" strokeWidth={2.1} />
                        </span>
                        <span className="text-[14.5px] font-semibold text-ink-soft">{r.label}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* governance */}
        <section className="px-4 pb-8">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
            {GOVERNANCE.map((g, i) => (
              <Reveal key={g.title} delay={0.05 * i}>
                <div className="h-full rounded-3xl border border-white/60 bg-white/55 p-6 shadow-soft backdrop-blur-md">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-aqua-400/15">
                    <g.icon className="h-5 w-5 text-aqua-600" strokeWidth={2} />
                  </span>
                  <div className="mt-4 text-lg font-bold text-ink">{g.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{g.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* closing */}
        <section className="px-4 py-20 text-center sm:py-24">
          <Reveal>
            <p className="mx-auto max-w-3xl text-balance font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
              Cover the pregnancy, not just the emergency.{' '}
              <span className="text-gradient not-italic">We can show you how.</span>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                Book a walkthrough
              </LiquidButton>
              <LiquidButton size="lg" variant="glass" onClick={() => navigate('/doctor')}>
                See the clinician portal
              </LiquidButton>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
