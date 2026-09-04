import { BrainCircuit, Sparkles, TrendingUp, Bell, Syringe } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MiniAreaChart } from '@/components/charts/MiniAreaChart';
import { SectionHeading } from './SectionHeading';
import { weightTrend } from '@/data/landing';

export function Showcase() {
  return (
    <section id="showcase" className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="A dashboard that calms"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="Clarity, not clutter"
          description="Every surface is designed to reduce anxiety — soft depth, generous space and only what matters, right now."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* AI card — spans two columns */}
          <Reveal className="lg:col-span-2">
            <GlassCard strong className="h-full overflow-hidden p-7">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
                  <BrainCircuit className="h-5 w-5 text-white" />
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    AI risk assessment
                  </div>
                  <div className="text-lg font-bold text-ink">Personalised, and explainable</div>
                </div>
              </div>

              <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                <div className="grid place-items-center">
                  <ProgressRing value={18} size={132} label="Low" sublabel="18 / 100" gradientId="showcaseRing" />
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Blood pressure', note: '118/76 · normal range', good: true },
                    { label: 'Fasting glucose', note: '88 mg/dL · within target', good: true },
                    { label: 'Weight gain', note: '+11.5 kg · healthy trajectory', good: true },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-ink">{r.label}</div>
                        <div className="text-xs text-ink-muted">{r.note}</div>
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.18)]" />
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </Reveal>

          {/* stacked right column */}
          <div className="flex flex-col gap-5">
            <Reveal delay={0.08}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                  <TrendingUp className="h-4 w-4 text-aqua-500" /> Weight trend
                </div>
                <div className="mt-1 text-2xl font-bold text-ink">65.8 kg</div>
                <div className="mt-2">
                  <MiniAreaChart
                    data={weightTrend}
                    xKey="d"
                    height={96}
                    yUnit="kg"
                    series={[{ key: 'kg', color: '#3f66f0', label: 'Weight' }]}
                  />
                </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={0.14}>
              <GlassCard className="flex items-center gap-4 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400 to-brand-500">
                  <Syringe className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink">MR dose 2</div>
                  <div className="truncate text-xs text-ink-muted">Reminder scheduled · in 19 days</div>
                </div>
                <span className="ml-auto grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand-50 text-brand-500">
                  <Bell className="h-4 w-4" />
                </span>
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
