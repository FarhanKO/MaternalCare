import { motion } from 'framer-motion';
import {
  Apple, Baby, CalendarDays, CheckCircle2, Clock, Droplets, HeartPulse,
  Ruler, Scale, Syringe, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { LifeStage } from '@/lib/api';
import type { ChildState, Vaccination } from '@/data/records';
import type { Pregnancy, WeightGain } from '@/data/records';

/**
 * The card at the top of the mother's dashboard.
 *
 * This used to be one hard-coded pregnancy hero shown to everybody. Two
 * separate problems came out of that.
 *
 * It ignored her life stage. The app has always let a woman say she is
 * planning a pregnancy, pregnant, a new mother, or the parent of a young
 * child — and then showed all four of them a forty-week countdown. Somebody
 * planning a pregnancy was told she was 29 weeks into one.
 *
 * And most of what it displayed was written into the source. "December 2025",
 * a day strip fixed at the 15th to the 21st, "Due · Apr 2", "Butternut squash ·
 * 35.6 cm · 760 g", "148 bpm", "5 days ahead of average growth", and a
 * "Second trimester" label that sat there while the model said third. Every one
 * of those contradicted the app's own record: it had her due in November, at
 * 73 days out, carrying something the size of an eggplant. A mother reading the
 * most prominent card in the product was reading the wrong due date.
 *
 * So: four heroes, one per stage, and every figure on all of them comes from
 * her record. Where a figure is not known, the tile says so rather than
 * inventing one — there is no "heartbeat" tile any more, because this app has
 * never measured a fetal heartbeat.
 */

const GRADIENT: Record<string, string> = {
  pregnant: 'linear-gradient(148deg, #ff9db9 0%, #ff7ba6 46%, #f76592 100%)',
  planning: 'linear-gradient(148deg, #a78bfa 0%, #8b7bf3 46%, #7c5cf0 100%)',
  'new-mother': 'linear-gradient(148deg, #7dd3c0 0%, #4fc3a1 46%, #2fbf9b 100%)',
  parent: 'linear-gradient(148deg, #fbbf6c 0%, #fb9f4c 46%, #fb7534 100%)',
};

const ORDINAL = ['th', 'st', 'nd', 'rd'];
const ord = (n: number) => {
  const r = n % 100;
  return r >= 11 && r <= 13 ? `${n}th` : `${n}${ORDINAL[n % 10] || 'th'}`;
};

/** The real week around today, so the strip is a calendar and not decoration. */
function thisWeek(locale: string) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      key: d.toISOString().slice(0, 10),
      letter: d.toLocaleDateString(locale, { weekday: 'narrow' }),
      day: d.getDate(),
      today: d.toDateString() === now.toDateString(),
    };
  });
}

function Tile({ icon: Icon, label, value }: {
  icon: typeof Clock; label: string; value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/75">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-xl font-extrabold leading-none sm:text-2xl">{value}</div>
    </div>
  );
}

function Shell({
  stage, month, days, badge, children, footer,
}: {
  stage: string;
  month: string;
  days: ReturnType<typeof thisWeek>;
  badge: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-4xl p-6 text-white shadow-glass-lg sm:p-8"
      style={{ background: GRADIENT[stage] ?? GRADIENT.pregnant }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white/90">{month}</div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
            {badge}
          </span>
        </div>

        {/* the real week, with today actually today */}
        <div className="mx-auto mt-4 flex max-w-xl items-center justify-between gap-1">
          {days.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold text-white/70">{d.letter}</span>
              <span className={cn(
                'grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition',
                d.today ? 'bg-white text-ink shadow-lg' : 'text-white/90',
              )}
              >
                {d.day}
              </span>
              <span className={cn('h-1 w-1 rounded-full', d.today ? 'bg-white' : 'bg-white/30')} />
            </div>
          ))}
        </div>

        {children}

        {footer && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- pregnant */

const MILESTONES = [
  { wk: 12, label: 'End of 1st tri' },
  { wk: 20, label: 'Anomaly scan' },
  { wk: 24, label: 'Viability' },
  { wk: 37, label: 'Full term' },
];

const TRI_NAME = ['', 'First trimester', 'Second trimester', 'Third trimester'];

function PregnancyArc({ pregnancy }: { pregnancy: Pregnancy }) {
  const week = pregnancy.week;
  const total = 40;
  const W = 900; const H = 224; const cx = 450; const topY = 46; const rise = 132;
  const alpha = 2 * Math.atan((2 * rise) / W);
  const R = (W / 2) / Math.sin(alpha);
  const cy = topY + R;
  const at = (f: number) => {
    const a = Math.PI / 2 + alpha - f * 2 * alpha;
    return { x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) };
  };
  const f = Math.min(1, week / total);
  const L = at(0); const Rt = at(1); const M = at(f);
  const arcLen = R * 2 * alpha;
  const d = `M ${L.x.toFixed(1)} ${L.y.toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${Rt.x.toFixed(1)} ${Rt.y.toFixed(1)}`;
  const pctL = (p: { x: number; y: number }) => `${(p.x / W) * 100}%`;
  const pctT = (p: { x: number; y: number }) => `${(p.y / H) * 100}%`;
  const dueShort = pregnancy.eddPretty.replace(/,.*$/, '');

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="arcFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth={14} strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke="url(#arcFill)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          initial={{ strokeDashoffset: arcLen }}
          whileInView={{ strokeDashoffset: arcLen * (1 - f) }}
          viewport={{ once: true }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.12))' }}
        />
        {MILESTONES.map((mst) => {
          const p = at(mst.wk / total);
          return <circle key={mst.wk} cx={p.x} cy={p.y} r={2.6} fill="rgba(255,255,255,0.6)" />;
        })}
        {[13, 27].map((t) => {
          const p = at(t / total);
          return <circle key={t} cx={p.x} cy={p.y} r={4} fill="rgba(255,255,255,0.92)" />;
        })}
        <circle cx={M.x} cy={M.y} r={11} fill="#fff" />
        <circle cx={M.x} cy={M.y} r={5} fill="#f76592" />
      </svg>

      <div className="pointer-events-none absolute whitespace-nowrap" style={{ left: pctL(L), top: pctT(L), transform: 'translate(0, 10px)' }}>
        <div className="text-[11px] font-bold leading-tight text-white">Week 0</div>
        <div className="text-[10px] font-medium text-white/70">Conception</div>
      </div>
      <div className="pointer-events-none absolute whitespace-nowrap text-right" style={{ left: pctL(Rt), top: pctT(Rt), transform: 'translate(-100%, 10px)' }}>
        <div className="text-[11px] font-bold leading-tight text-white">Week 40</div>
        {/* her real due date, not a date typed into the source */}
        <div className="text-[10px] font-medium text-white/70">Due · {dueShort}</div>
      </div>

      {[{ wk: 13, t: '2nd tri' }, { wk: 27, t: '3rd tri' }].map((it) => {
        const p = at(it.wk / total);
        return (
          <div key={it.wk} className="pointer-events-none absolute" style={{ left: pctL(p), top: pctT(p), transform: 'translate(-50%, 55%)' }}>
            <span className="whitespace-nowrap rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-md">{it.t}</span>
          </div>
        );
      })}

      <div className="pointer-events-none absolute" style={{ left: pctL(M), top: pctT(M), transform: 'translate(-50%, -210%)' }}>
        <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-rose-600 shadow-lg">You · Wk {week}</span>
      </div>

      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center" style={{ top: '44%' }}>
        {/* the trimester the model computed, not one written down once */}
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
          {TRI_NAME[pregnancy.trimester] ?? ''}
        </span>
        <div className="flex items-end justify-center gap-1.5 leading-none">
          <span className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">{week}</span>
          <span className="pb-1 text-base font-bold text-white/80">weeks</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md">
          <Apple className="h-3.5 w-3.5" /> {pregnancy.babySize.fruit} · {pregnancy.babySize.length} · {pregnancy.babySize.weight}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ API */

export interface StageHeroProps {
  stage: LifeStage;
  pregnancy: Pregnancy | null;
  child: ChildState | null;
  weightGain: WeightGain | null;
  vaccinations: Vaccination[];
  locale: string;
  onEditDates: () => void;
}

export function StageHero({
  stage, pregnancy, child, weightGain, vaccinations, locale, onEditDates,
}: StageHeroProps) {
  const now = new Date();
  const month = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const days = thisWeek(locale);

  /*
   * Whose vaccination to show depends on whose stage it is. A parent of a
   * young child was being shown the mother's seasonal flu jab, which is real
   * but is not the thing they opened this screen for; and on the pregnancy
   * and planning heroes the reverse would be true. Falls back to the other
   * subject rather than showing nothing.
   */
  const wantSubject = stage === 'parent' || stage === 'new-mother' ? 'child' : 'mother';
  const outstanding = vaccinations
    .filter((v) => v.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextDue = outstanding.find((v) => v.subject === wantSubject) ?? outstanding[0];

  /* ------------------------------------------------------- pregnant */
  if (stage === 'pregnant' && pregnancy) {
    return (
      <Shell
        stage="pregnant"
        month={month}
        days={days}
        badge={`Trimester ${pregnancy.trimester}`}
        footer={(
          <>
            <div className="text-sm text-white/85">
              {pregnancy.weekNote}
            </div>
            <button
              onClick={onEditDates}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-rose-600 shadow-lg transition hover:bg-white/90"
            >
              <CalendarDays className="h-[18px] w-[18px]" /> Edit due date
            </button>
          </>
        )}
      >
        <div className="mt-6"><PregnancyArc pregnancy={pregnancy} /></div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile icon={CalendarDays} label="Due date" value={pregnancy.eddPretty.replace(/,.*$/, '')} />
          <Tile icon={Clock} label="Days to go" value={String(pregnancy.daysLeft)} />
          <Tile icon={Ruler} label="Baby length" value={pregnancy.babySize.length} />
          <Tile icon={Scale} label="Baby weight" value={pregnancy.babySize.weight} />
          {weightGain
            ? <Tile icon={TrendingUp} label="You have gained" value={`${weightGain.gainedKg} kg`} />
            : <Tile icon={Syringe} label="Next vaccination" value={nextDue ? nextDue.name : '—'} />}
        </div>
      </Shell>
    );
  }

  /* -------------------------------------------------------- planning */
  if (stage === 'planning') {
    return (
      <Shell
        stage="planning"
        month={month}
        days={days}
        badge="Getting ready"
        footer={(
          <>
            <div className="text-sm text-white/85">
              The things worth sorting out before you conceive, not after.
            </div>
            <button
              onClick={onEditDates}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-600 shadow-lg transition hover:bg-white/90"
            >
              <CalendarDays className="h-[18px] w-[18px]" /> Update your details
            </button>
          </>
        )}
      >
        <div className="mt-7 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Planning a pregnancy
          </div>
          <div className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Folic acid, starting now
          </div>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/90">
            400&nbsp;µg a day, from at least a month before you conceive. The part of
            the baby it protects is formed in the weeks before most people know
            they are pregnant — which is the one window that closes on its own.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon={Apple} label="Folic acid" value="400 µg / day" />
          {weightGain
            ? <Tile icon={Scale} label="Your BMI" value={`${weightGain.bmi}`} />
            : <Tile icon={Scale} label="Your BMI" value="Add weight" />}
          <Tile
            icon={Syringe}
            label="Before conceiving"
            value={nextDue ? nextDue.name.split(' ')[0] : 'Check immunity'}
          />
          <Tile icon={HeartPulse} label="Track" value="BP & weight" />
        </div>
      </Shell>
    );
  }

  /* ----------------------------------------------------- new mother */
  if (stage === 'new-mother') {
    const weeksOld = child?.child
      ? Math.max(0, Math.floor(
        (Date.now() - new Date(`${child.child.dob}T00:00:00`).getTime()) / (7 * 86400000),
      ))
      : null;

    return (
      <Shell
        stage="new-mother"
        month={month}
        days={days}
        badge={weeksOld !== null && weeksOld < 6 ? 'Fourth trimester' : 'After the birth'}
        footer={(
          <>
            <div className="text-sm text-white/85">
              Your recovery matters as much as the feeding does.
            </div>
            <button
              onClick={onEditDates}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-600 shadow-lg transition hover:bg-white/90"
            >
              <Baby className="h-[18px] w-[18px]" /> Update {child?.child?.name ?? 'baby'}
            </button>
          </>
        )}
      >
        <div className="mt-7 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            {child?.child ? child.child.name : 'Your baby'}
          </div>
          {weeksOld !== null ? (
            <div className="flex items-end justify-center gap-1.5 leading-none">
              <span className="text-5xl font-extrabold tracking-tight sm:text-6xl">{weeksOld}</span>
              <span className="pb-1 text-base font-bold text-white/80">
                {weeksOld === 1 ? 'week old' : 'weeks old'}
              </span>
            </div>
          ) : (
            <div className="mt-2 text-2xl font-extrabold">Add your baby’s birthday</div>
          )}
          {weeksOld !== null && weeksOld < 8 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Your six-week check is the one appointment not to miss
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon={Droplets} label="Fluid a day" value="3 L" />
          <Tile icon={Apple} label="Extra energy" value="+450 kcal" />
          <Tile
            icon={Syringe}
            label="Next vaccination"
            value={nextDue ? nextDue.name.split(' ')[0] : 'None due'}
          />
          <Tile
            icon={Baby}
            label="Milestones"
            value={child ? `${child.milestones.filter((m) => m.achieved).length}/${child.milestones.length}` : '—'}
          />
        </div>
      </Shell>
    );
  }

  /* --------------------------------------------------------- parent */
  const weight = child?.percentile?.measures?.find((m) => m.key === 'weight' && m.available);

  return (
    <Shell
      stage="parent"
      month={month}
      days={days}
      badge="Growing up"
      footer={(
        <>
          <div className="text-sm text-white/85">
            Growth is a direction, not a single reading.
          </div>
          <button
            onClick={onEditDates}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-peach-600 shadow-lg transition hover:bg-white/90"
          >
            <Ruler className="h-[18px] w-[18px]" /> Add a measurement
          </button>
        </>
      )}
    >
      <div className="mt-7 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
          {child?.child ? child.child.name : 'Your child'}
        </div>
        {child?.child ? (
          <div className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {child.child.agePretty}
          </div>
        ) : (
          <div className="mt-2 text-2xl font-extrabold">Add your child</div>
        )}
        {weight && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md">
            <TrendingUp className="h-3.5 w-3.5" />
            Weight on the {weight.centileLabel ?? ord(Number(weight.centile))} centile
            {' '}· {weight.band?.label.toLowerCase()}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={Scale} label="Weight" value={weight ? `${weight.value} kg` : '—'} />
        <Tile
          icon={Ruler}
          label="Height"
          value={(() => {
            const h = child?.percentile?.measures?.find((m) => m.key === 'height' && m.available);
            return h ? `${h.value} cm` : '—';
          })()}
        />
        <Tile
          icon={Syringe}
          label="Next vaccination"
          value={nextDue ? nextDue.name.split(' ')[0] : 'None due'}
        />
        <Tile
          icon={Baby}
          label="Milestones"
          value={child ? `${child.milestones.filter((m) => m.achieved).length}/${child.milestones.length}` : '—'}
        />
      </div>
    </Shell>
  );
}
