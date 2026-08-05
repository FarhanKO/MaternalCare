import { motion } from 'framer-motion';
import { Baby, HeartPulse, ShieldCheck, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MiniAreaChart } from '@/components/charts/MiniAreaChart';
import { bpTrend } from '@/data/landing';
import { spring } from '@/lib/motion';

/** The floating "app preview" — a glass dashboard fragment with live charts. */
export function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12, filter: 'blur(14px)' }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
      transition={{ ...spring, delay: 0.35 }}
      className="relative mx-auto w-full max-w-xl"
      style={{ perspective: 1200 }}
    >
      <GlassCard strong className="p-5 sm:p-6" glow>
        {/* header row */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Today</div>
            <div className="text-lg font-bold text-ink">Health overview</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Low risk
          </span>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* chart */}
          <div className="col-span-3 rounded-3xl border border-white/60 bg-white/50 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <HeartPulse className="h-4 w-4 text-brand-500" /> Blood pressure
            </div>
            <div className="mb-2 text-2xl font-bold tracking-tight text-ink">
              118<span className="text-base font-semibold text-ink-faint">/76 mmHg</span>
            </div>
            <MiniAreaChart
              data={bpTrend}
              xKey="d"
              height={128}
              yUnit="mmHg"
              series={[
                { key: 'systolic', color: '#3f66f0', label: 'Systolic' },
                { key: 'diastolic', color: '#22b8c4', label: 'Diastolic' },
              ]}
            />
          </div>

          {/* ring + stat */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="grid flex-1 place-items-center rounded-3xl border border-white/60 bg-white/50 p-3">
              <ProgressRing value={65} size={104} label="65%" sublabel="Week 26" />
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <TrendingUp className="h-4 w-4 text-aqua-500" /> Weight
              </div>
              <div className="mt-1 text-xl font-bold text-ink">65.8 kg</div>
              <div className="text-[11px] font-semibold text-emerald-600">Healthy range</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* floating chips */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...spring, delay: 0.7 }}
        className="absolute -left-6 top-16 hidden animate-float sm:block"
      >
        <GlassCard strong className="flex items-center gap-2.5 px-3.5 py-2.5" ring={false}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Baby className="h-4 w-4 text-white" />
          </span>
          <div className="pr-1">
            <div className="text-xs font-bold text-ink">Week 26</div>
            <div className="text-[10px] font-medium text-ink-faint">Baby developing well</div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...spring, delay: 0.85 }}
        className="absolute -right-5 bottom-10 hidden animate-float sm:block"
        style={{ animationDelay: '-2s' }}
      >
        <GlassCard strong className="flex items-center gap-2.5 px-3.5 py-2.5" ring={false}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-aqua-400 to-brand-500">
            <ShieldCheck className="h-4 w-4 text-white" />
          </span>
          <div className="pr-1">
            <div className="text-xs font-bold text-ink">Next visit</div>
            <div className="text-[10px] font-medium text-ink-faint">in 4 days · 10:30</div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
