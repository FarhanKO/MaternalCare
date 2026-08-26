import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ChevronDown, Droplets, Info, Salad, Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { Advice, CarePlan as Plan } from '@/data/records';

/**
 * The personalised nutrition, movement and lifestyle plan.
 *
 * What stood here before was a card headed "Nutrition today — % of daily goal"
 * with five bars: Folate 92%, Iron 78%, Calcium 85%, Protein 70%, Omega-3 64%.
 * There has never been any food logging in this app. Those five numbers were
 * written into the source and could not have been measured — and a progress
 * bar is not a suggestion, it is a claim about her body. A mother reading
 * "Iron 78%" would have believed she was mostly fine.
 *
 * So the bars are gone, and the distinction they blurred is now the thing the
 * card is built around: **targets** are what to aim for, **advice** is what to
 * do about her particular readings, and the single measured figure — water,
 * which she does log — is the only one drawn as progress.
 */

const DOMAINS = [
  { key: 'nutrition', label: 'Nutrition', icon: Salad, tint: '#f59e0b' },
  { key: 'exercise', label: 'Movement', icon: Activity, tint: '#8b5cf6' },
  { key: 'lifestyle', label: 'Lifestyle', icon: Sparkles, tint: '#ec4899' },
] as const;

type DomainKey = (typeof DOMAINS)[number]['key'];

const PRIORITY: Record<Advice['priority'], { chip: string; label: string } | null> = {
  urgent: { chip: 'bg-rose-500/15 text-rose-700', label: 'Now' },
  high: { chip: 'bg-amber-500/15 text-amber-700', label: 'Soon' },
  normal: null,
};

/** One item, with its reason folded away until asked for. */
function Item({ advice, tint }: { advice: Advice; tint: string }) {
  const [open, setOpen] = useState(false);
  const chip = PRIORITY[advice.priority];

  return (
    <div className="rounded-2xl border border-white/60 bg-white/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2.5 p-3 text-left"
      >
        <span
          className="mt-0.5 h-2 w-2 flex-none rounded-full"
          style={{ background: tint }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-extrabold text-ink">{advice.title}</span>
            {chip && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', chip.chip)}>
                {chip.label}
              </span>
            )}
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-ink-muted">{advice.text}</span>
        </span>
        <ChevronDown
          className={cn('mt-0.5 h-4 w-4 flex-none text-ink-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {/*
        The reason is the whole point of the feature, but it is also the part
        she only wants once — so it opens rather than shouting from every row.
      */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="border-t border-white/60 px-3 py-2.5 text-[11.5px] font-medium leading-relaxed text-ink-soft">
              <span className="font-bold text-ink">Why you: </span>
              {advice.why}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CarePlan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [tab, setTab] = useState<DomainKey>('nutrition');

  useEffect(() => {
    let cancelled = false;
    api.getGuidance()
      .then((p) => { if (!cancelled) { setPlan(p); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('offline'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return (
      <div className="mt-9">
        <GlassCard className="p-6">
          <p className="py-6 text-center text-[12px] font-semibold text-ink-faint">
            Building your plan…
          </p>
        </GlassCard>
      </div>
    );
  }

  if (state === 'offline' || !plan) {
    return (
      <div className="mt-9">
        <GlassCard className="p-6">
          <p className="py-6 text-center text-[12px] font-semibold text-ink-muted">
            Your plan needs your record, and we cannot reach it right now.
          </p>
        </GlassCard>
      </div>
    );
  }

  const active = DOMAINS.find((d) => d.key === tab)!;
  const items = plan[tab];
  const urgent = [...plan.nutrition, ...plan.exercise, ...plan.lifestyle]
    .filter((i) => i.priority === 'urgent');

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Your care plan</h2>
        <p className="text-sm text-ink-muted">
          Nutrition, movement and lifestyle for where you are — every line says which of your
          own readings it came from.
        </p>
      </Reveal>

      {/* what it was built from: the claim of personalisation, itemised */}
      {plan.basis.length > 0 && (
        <Reveal className="mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
              Built from
            </span>
            {plan.basis.map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/60 bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink-soft"
              >
                {b}
              </span>
            ))}
          </div>
        </Reveal>
      )}

      {urgent.length > 0 && (
        <Reveal className="mb-4">
          <div className="flex items-start gap-2.5 rounded-2xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-500/25">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
            <div>
              <div className="text-[13px] font-extrabold text-ink">{urgent[0].title}</div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{urgent[0].text}</div>
            </div>
          </div>
        </Reveal>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* advice, by domain */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex gap-1.5">
              {DOMAINS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setTab(d.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11.5px] font-bold ring-1 transition',
                    tab === d.key ? 'text-ink ring-transparent' : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink',
                  )}
                  style={tab === d.key ? { background: `${d.tint}22`, color: d.tint } : undefined}
                >
                  <d.icon className="h-3.5 w-3.5" />
                  {d.label}
                  <span className="font-semibold opacity-70">{plan[d.key].length}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {items.length === 0 ? (
                <p className="py-6 text-center text-[12px] font-semibold text-ink-faint">
                  Nothing to change here right now.
                </p>
              ) : items.map((a) => (
                <Item key={a.title} advice={a} tint={active.tint} />
              ))}
            </div>
          </GlassCard>
        </Reveal>

        {/* targets + the one measured figure */}
        <Reveal>
          <GlassCard float className="h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: '#f59e0b1f', color: '#f59e0b' }}
              >
                <Salad className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">Daily targets</div>
                <div className="text-xs text-ink-muted">
                  {plan.week ? `For week ${plan.week}` : 'For your stage'}
                </div>
              </div>
            </div>

            {/*
              Said outright, because the panel this replaced said the opposite
              by implication and a mother has no way to tell the two apart from
              a bar chart alone.
            */}
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-ink/[0.04] px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-ink-faint" />
              <p className="text-[11px] font-medium leading-relaxed text-ink-muted">
                What to aim for — not what you have eaten. There is no food diary here, so
                nothing on this list is a measurement of you.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {plan.targets.map((t) => (
                <div key={t.key} className="border-b border-white/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] font-extrabold text-ink">{t.label}</span>
                    <span
                      className={cn(
                        'flex-none text-[12px] font-bold',
                        t.flagged ? 'text-rose-600' : 'text-brand-700',
                      )}
                    >
                      {t.amount}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{t.why}</p>
                </div>
              ))}
            </div>

            {/* the exception: she logs her water, so this one is real */}
            <div className="mt-5 rounded-2xl border border-white/60 bg-white/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-ink">
                  <Droplets className="h-3.5 w-3.5 text-aqua-500" /> Water
                </span>
                <span className="text-[11px] font-bold text-ink-muted">
                  {plan.hydration.avgLitres === null
                    ? 'Not logged yet'
                    : `${plan.hydration.avgLitres} of ${plan.hydration.targetLitres} L`}
                </span>
              </div>
              {plan.hydration.pct !== null && (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-brand-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${plan.hydration.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10.5px] font-semibold text-ink-faint">
                    Your average across {plan.hydration.days} logged days — the one figure here
                    that is measured.
                  </p>
                </>
              )}
            </div>
          </GlassCard>
        </Reveal>
      </div>

      <p className="mt-3 text-[10.5px] font-medium leading-relaxed text-ink-faint">
        {plan.method}
      </p>
    </div>
  );
}
