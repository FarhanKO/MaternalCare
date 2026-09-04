import { motion } from 'framer-motion';
import { AlertTriangle, Check, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/cn';
import type { VitalAlert, WeightGain } from '@/data/records';

/**
 * Every reading currently outside its range, in one place.
 *
 * Weight gain already had this treatment — a chip saying "a little over" and
 * the band it should sit in. Nothing else did, so a glucose reading nine
 * points above the safe limit looked exactly like one comfortably inside it,
 * and you only found out by reading the axis.
 *
 * The ranges are not invented here. They come from `vitalModel.THRESHOLDS` on
 * the server, so this panel, the clinician's alerts and the risk score all
 * disagree about nothing.
 */

type Level = 'emergency' | 'critical' | 'warning';

const LEVEL: Record<Level, {
  label: string; row: string; chip: string; icon: typeof ShieldAlert;
}> = {
  emergency: {
    label: 'Urgent',
    row: 'bg-rose-500/10 ring-rose-500/25',
    chip: 'bg-rose-600 text-white',
    icon: ShieldAlert,
  },
  critical: {
    label: 'Above the safe limit',
    row: 'bg-rose-500/[0.07] ring-rose-500/20',
    chip: 'bg-rose-500/15 text-rose-700',
    icon: AlertTriangle,
  },
  warning: {
    label: 'Worth watching',
    row: 'bg-amber-500/10 ring-amber-500/25',
    chip: 'bg-amber-500/15 text-amber-700',
    icon: AlertTriangle,
  },
};

const levelOf = (a: VitalAlert): Level =>
  (a.level === 'emergency' ? 'emergency' : a.level === 'critical' ? 'critical' : 'warning');

const RANK: Record<Level, number> = { emergency: 0, critical: 1, warning: 2 };

interface Row {
  key: string;
  level: Level;
  metric: string;
  value: string;
  message: string;
}

export function OutOfRange({
  alerts, weightGain, loaded,
}: {
  alerts: VitalAlert[];
  weightGain: WeightGain | null;
  /** don't claim "all in range" before anything has loaded */
  loaded: boolean;
}) {
  const rows: Row[] = alerts.map((a, i) => ({
    key: `v-${i}`,
    level: levelOf(a),
    metric: a.metric,
    value: String(a.value),
    message: a.message ?? 'Outside the usual range.',
  }));

  // weight is computed differently — against her own booking BMI, not a table
  if (weightGain && weightGain.status !== 'on-track') {
    // `note` already says which way she is out, so this only adds the band
    rows.push({
      key: 'weight',
      level: 'warning',
      metric: 'Weight gain',
      value: `${weightGain.gainedKg >= 0 ? '+' : ''}${weightGain.gainedKg} kg`,
      message: `${weightGain.note} Expected ${weightGain.expected.low}–${weightGain.expected.high} kg by week ${weightGain.week}.`,
    });
  }

  rows.sort((a, b) => RANK[a.level] - RANK[b.level]);

  if (!loaded) return null;

  if (rows.length === 0) {
    return (
      <GlassCard float className="flex items-center gap-3 p-4">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-emerald-500/12 text-emerald-600">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <div>
          <div className="text-sm font-bold text-ink">Everything is in range</div>
          <div className="text-[11.5px] text-ink-muted">
            Every reading you have logged sits inside its usual band.
          </div>
        </div>
      </GlassCard>
    );
  }

  const worst = rows[0].level;
  const Icon = LEVEL[worst].icon;

  return (
    <GlassCard float className="overflow-hidden p-0">
      <div className="flex items-center gap-3 px-5 pt-4">
        <span className={cn('grid h-9 w-9 flex-none place-items-center rounded-xl',
          worst === 'warning' ? 'bg-amber-500/15 text-amber-600' : 'bg-rose-500/12 text-rose-600')}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">
            {rows.length} reading{rows.length === 1 ? '' : 's'} outside the usual range
          </div>
          <div className="text-[11.5px] text-ink-muted">
            Sorted by how far out. Your care team sees these too.
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 px-5 pb-5">
        {rows.map((r, i) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.28 }}
            className={cn('rounded-2xl px-3.5 py-3 ring-1', LEVEL[r.level].row)}
          >
            <div className="flex flex-wrap items-center gap-2">
              {r.level === 'warning'
                ? <TrendingUp className="h-3.5 w-3.5 flex-none text-amber-600" />
                : <TrendingDown className="h-3.5 w-3.5 flex-none rotate-180 text-rose-600" />}
              <span className="text-[13px] font-extrabold text-ink">{r.metric}</span>
              <span className="text-[13px] font-extrabold tabular-nums text-ink-soft">{r.value}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                LEVEL[r.level].chip)}>
                {LEVEL[r.level].label}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-ink-muted">{r.message}</p>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

/**
 * The small chip a chart card wears when its own metric is out of range.
 * `match` is tested against the alert's metric label.
 */
export function RangeChip({ alerts, match }: { alerts: VitalAlert[]; match: RegExp }) {
  const hit = alerts.find((a) => match.test(a.metric));
  if (!hit) {
    return (
      <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        Normal
      </span>
    );
  }
  const level = levelOf(hit);
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', LEVEL[level].chip)}>
      {level === 'warning' ? 'Worth watching' : 'Check with your doctor'}
    </span>
  );
}
