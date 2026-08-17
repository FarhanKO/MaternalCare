import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Info, Scale } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { WeightGain } from '@/data/records';

const STATUS = {
  'on-track': { label: 'On track', tint: '#2fbf9b', ring: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25' },
  below: { label: 'A little under', tint: '#f6b93b', ring: 'bg-amber-500/12 text-amber-700 ring-amber-500/25' },
  above: { label: 'A little over', tint: '#f6b93b', ring: 'bg-amber-500/12 text-amber-700 ring-amber-500/25' },
};

const CATEGORY_LABEL: Record<string, string> = {
  underweight: 'under the healthy range',
  healthy: 'in the healthy range',
  overweight: 'over the healthy range',
  obese: 'well over the healthy range',
};

/**
 * Weight gain against what is expected by this week.
 *
 * A number on the scales says little on its own — the healthy range depends
 * entirely on where she started, which is why booking records a
 * pre-pregnancy weight and a height. This is the one place those two values
 * are actually used.
 */
export function WeightGainCard() {
  const [data, setData] = useState<WeightGain | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');

  useEffect(() => {
    api.getWeightGain()
      .then((d) => { setData(d); setState(d ? 'ready' : 'none'); })
      .catch(() => setState('none'));
  }, []);

  if (state !== 'ready' || !data) return null;

  const meta = STATUS[data.status];
  // scale the bar to the whole-pregnancy range so the marker keeps its meaning
  const ceiling = Math.max(data.totalRange.high, data.gainedKg) * 1.05;
  const pct = (v: number) => Math.min(100, Math.max(0, (v / ceiling) * 100));

  return (
    <GlassCard float className="p-5">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-aqua-500/15 text-aqua-600">
          <Scale className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink">Weight gain</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', meta.ring)}>
              {meta.label}
            </span>
          </div>
          <div className="text-[11px] text-ink-muted">
            Since before pregnancy · week {data.week}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold leading-none text-ink">
          +{data.gainedKg}
        </span>
        <span className="text-[11px] font-bold text-ink-faint">kg</span>
        <span className="ml-auto text-[11px] font-semibold text-ink-muted">
          {data.preWeightKg} → {data.currentWeightKg} kg
        </span>
      </div>

      {/* the expected band, with her actual gain marked against it */}
      <div className="relative mt-3 h-7">
        <div className="absolute inset-x-0 top-2.5 h-2 rounded-full bg-ink/8" />
        <div
          className="absolute top-2.5 h-2 rounded-full bg-emerald-400/35"
          style={{ left: `${pct(data.expected.low)}%`, width: `${pct(data.expected.high) - pct(data.expected.low)}%` }}
        />
        <motion.div
          className="absolute top-0.5 h-7 w-1 rounded-full"
          style={{ background: meta.tint }}
          initial={{ left: 0 }}
          animate={{ left: `calc(${pct(data.gainedKg)}% - 2px)` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-ink-faint">
        <span>0 kg</span>
        <span className="text-emerald-700">
          expected {data.expected.low}–{data.expected.high} kg by now
        </span>
        <span>{Math.round(ceiling)} kg</span>
      </div>

      <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-ink-soft">
        {data.note}
      </p>

      <div className="mt-2.5 flex items-start gap-1.5 rounded-2xl bg-white/55 px-3 py-2">
        <Info className="mt-[1px] h-3 w-3 flex-none text-ink-faint" />
        <p className="text-[10px] font-medium leading-relaxed text-ink-faint">
          Your starting BMI was {data.bmi}, {CATEGORY_LABEL[data.category]}, so the usual
          total for your whole pregnancy is {data.totalRange.low}–{data.totalRange.high} kg.
          This is general guidance, not a judgement — your doctor knows your situation.
        </p>
      </div>
    </GlassCard>
  );
}
