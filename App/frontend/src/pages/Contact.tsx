import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Baby,
  Building2,
  Clock,
  Globe,
  Info,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Where to reach us, split by who is asking — a mother with a booking problem
 * and a clinic asking about the network want different people.
 *
 * TODO before launch: the addresses and the hours below are project
 * placeholders. Swap them for the real ones. We are online-only for now, so
 * there is no street address — and no phone number, because an invented one
 * can ring a real stranger.
 */

interface Desk {
  icon: LucideIcon;
  who: string;
  blurb: string;
  email: string;
  subject: string;
  tone: string;
}

const DESKS: Desk[] = [
  {
    icon: Baby,
    who: 'Mothers & families',
    blurb:
      'Trouble signing in, a booking that did not go through, a payment you want checked, or anything about your own record.',
    email: 'support@maternalcare.app',
    subject: 'Help with my MaternalCare+ account',
    tone: 'from-brand-400 to-brand-600',
  },
  {
    icon: Stethoscope,
    who: 'Clinicians & clinics',
    blurb:
      'Joining the network, getting portal access for your practice, or a question about how the caseload and risk tiers work.',
    email: 'clinicians@maternalcare.app',
    subject: 'Joining MaternalCare+ as a clinician',
    tone: 'from-aqua-400 to-brand-500',
  },
  {
    icon: Building2,
    who: 'Health plans & employers',
    blurb:
      'Covering your members or staff, running a pilot, or booking a walkthrough of what the platform reports back to you.',
    email: 'partnerships@maternalcare.app',
    subject: 'MaternalCare+ for our members',
    tone: 'from-brand-500 to-brand-700',
  },
];

const DETAILS: { icon: LucideIcon; label: string; lines: string[] }[] = [
  { icon: Mail, label: 'General enquiries', lines: ['hello@maternalcare.app'] },
  { icon: Globe, label: 'Where we are', lines: ['Online only, for now', 'No office to visit yet'] },
  { icon: Clock, label: 'When we answer', lines: ['Sunday – Thursday', '9:00 – 18:00 (GMT+6)'] },
];

/** Opens the visitor's mail app with the right desk and subject already filled. */
const mailto = (d: Desk) => `mailto:${d.email}?subject=${encodeURIComponent(d.subject)}`;

export function Contact() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <main>
        {/* hero */}
        <section className="px-4 pt-28 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal className="flex justify-center">
              <Badge icon={<MessageCircle className="h-3.5 w-3.5" />}>Contact us</Badge>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Easier to reach than{' '}
                <span className="font-serif italic font-medium text-brand-600">you would expect</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                Write to the desk that fits your question and it lands with the people who can actually
                answer it — not a queue.
              </p>
            </Reveal>
          </div>
        </section>

        {/* the three desks */}
        <section className="px-4 py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {DESKS.map((d, i) => (
              <Reveal key={d.email} delay={0.05 * i}>
                <GlassCard float className="flex h-full flex-col p-6">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${d.tone} shadow-glow`}>
                    <d.icon className="h-[22px] w-[22px] text-white" strokeWidth={2} />
                  </span>
                  <h2 className="mt-5 text-lg font-bold tracking-tight text-ink">{d.who}</h2>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{d.blurb}</p>
                  <a
                    href={mailto(d)}
                    className="mt-5 inline-flex items-start gap-2 self-start rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-[13.5px] font-bold text-brand-700 shadow-soft backdrop-blur-md transition hover:bg-white"
                  >
                    <Mail className="mt-[3px] h-4 w-4 flex-none" />
                    <span className="break-all">{d.email}</span>
                  </a>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* not an emergency service — the one thing this page must say */}
        <section className="px-4 pb-14">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="flex flex-col gap-4 rounded-4xl border border-rose-500/25 bg-rose-500/10 p-6 sm:flex-row sm:items-center sm:p-7">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-rose-500/15">
                  <ShieldAlert className="h-6 w-6 text-rose-600" strokeWidth={2} />
                </span>
                <div className="flex-1">
                  <div className="text-lg font-bold tracking-tight text-ink">This inbox is not an emergency service</div>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
                    Nobody watches it overnight. If something is wrong right now — bleeding, severe pain, a
                    baby who has stopped moving — call <span className="font-bold text-ink">999</span> or go
                    straight to your nearest maternity unit. Inside the app, the SOS button reaches your
                    guardians and your care team at once.
                  </p>
                </div>
                <div className="flex-none">
                  <a
                    href="tel:999"
                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-rose-700"
                  >
                    <Phone className="h-4 w-4" /> Call 999
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* the details */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Our details"
              icon={<Info className="h-3.5 w-3.5" />}
              title="Everything else you might need"
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {DETAILS.map((d, i) => (
                <Reveal key={d.label} delay={0.05 * i}>
                  <div className="h-full rounded-3xl border border-white/60 bg-white/55 p-6 shadow-soft backdrop-blur-md">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 ring-1 ring-brand-200/70">
                      <d.icon className="h-5 w-5 text-brand-600" strokeWidth={2} />
                    </span>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                      {d.label}
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {d.lines.map((line) =>
                        line.includes('@') ? (
                          <a
                            key={line}
                            href={`mailto:${line}`}
                            className="block text-[15px] font-bold text-brand-700 transition hover:text-brand-800"
                          >
                            {line}
                          </a>
                        ) : (
                          <div key={line} className="text-[15px] font-semibold text-ink-soft">
                            {line}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* closing */}
        <section className="px-4 py-16 text-center sm:py-20">
          <Reveal>
            <p className="mx-auto max-w-2xl text-balance font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
              Not sure who to write to?{' '}
              <span className="text-gradient not-italic">Start anywhere.</span>
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted">
              We would rather answer the wrong question than have you not ask it.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="mailto:hello@maternalcare.app">
                <LiquidButton size="lg" iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                  Email us
                </LiquidButton>
              </a>
              <LiquidButton size="lg" variant="glass" onClick={() => navigate('/register')}>
                Create an account
              </LiquidButton>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
