import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { GlassDatePicker } from '@/components/ui/GlassDatePicker';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { normalizeStage, stepsFor, STAGE_LABEL, type Field } from '@/data/onboarding';

type Answers = Record<string, string | string[]>;

const inputClass =
  'h-14 w-full rounded-2xl border border-ink/10 bg-white/70 px-4 text-[15px] font-medium text-ink outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15';

/** Selectable pills — single-select or multi-select (chips). */
function PillGroup({
  options,
  isSelected,
  onPick,
}: {
  options: string[];
  isSelected: (o: string) => boolean;
  onPick: (o: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const none = o === 'None';
        const sel = isSelected(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className={cn(
              'rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
              sel && none && 'border-transparent bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-soft',
              sel && !none && 'border-transparent bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft',
              !sel && none && 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400',
              !sel && !none && 'border-ink/10 bg-white/70 text-ink-soft hover:border-brand-300 hover:text-ink',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** A simple labeled number field used by the body-metrics step. */
function MetricField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2.5 text-sm font-semibold text-ink-soft">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

/** Body metrics with a glassmorphic metric/imperial unit toggle. */
function BodyMetrics({ answers, set }: { answers: Answers; set: (id: string, v: string) => void }) {
  const system = (answers['bm_system'] as string) || 'metric';
  const v = (id: string) => (answers[id] as string) ?? '';
  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-full border border-white/60 bg-white/50 p-1 shadow-soft backdrop-blur-md">
        {(['metric', 'imperial'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => set('bm_system', s)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200',
              system === s ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft' : 'text-ink-muted hover:text-ink',
            )}
          >
            {s === 'metric' ? 'cm · kg' : 'ft · in · lb'}
          </button>
        ))}
      </div>

      {system === 'metric' ? (
        <>
          <MetricField label="Height (cm)" value={v('height_cm')} onChange={(x) => set('height_cm', x)} />
          <MetricField label="Weight (kg)" value={v('weight_kg')} onChange={(x) => set('weight_kg', x)} />
        </>
      ) : (
        <>
          <div>
            <div className="mb-2.5 text-sm font-semibold text-ink-soft">Height (ft / in)</div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Feet" value={v('height_ft')} onChange={(e) => set('height_ft', e.target.value)} className={inputClass} />
              <input type="number" placeholder="Inches" value={v('height_in')} onChange={(e) => set('height_in', e.target.value)} className={inputClass} />
            </div>
          </div>
          <MetricField label="Weight (lb)" value={v('weight_lb')} onChange={(x) => set('weight_lb', x)} />
        </>
      )}
    </div>
  );
}

export function Onboarding() {
  const [params] = useSearchParams();
  const stage = normalizeStage(params.get('stage'));
  const steps = useMemo(() => stepsFor(stage), [stage]);
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [done, setDone] = useState(false);

  const total = steps.length;
  const step = steps[index];
  const set = (id: string, v: string | string[]) => setAnswers((a) => ({ ...a, [id]: v }));

  const next = () => {
    if (index < total - 1) {
      setDir(1);
      setIndex((i) => i + 1);
    } else setDone(true);
  };
  const back = () => {
    if (index > 0) {
      setDir(-1);
      setIndex((i) => i - 1);
    }
  };

  // animate the card body height between steps so nothing snaps
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | 'auto'>('auto');
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderField = (field: Field) => {
    const val = answers[field.id];
    const labelText = field.unit ? `${field.label} (${field.unit})` : field.label;

    if (field.type === 'date') {
      return (
        <div key={field.id}>
          <GlassDatePicker label={field.label} value={val as string} onChange={(vv) => set(field.id, vv)} />
        </div>
      );
    }

    return (
      <div key={field.id}>
        <div className="mb-2.5 text-sm font-semibold text-ink-soft">
          {labelText}
          {field.optional && <span className="font-medium text-ink-faint"> · optional</span>}
        </div>
        {field.type === 'select' && (
          <PillGroup
            options={field.options!}
            isSelected={(o) => answers[field.id] === o}
            onPick={(o) => set(field.id, o)}
          />
        )}
        {field.type === 'chips' && (
          <PillGroup
            options={field.options!}
            isSelected={(o) => ((answers[field.id] as string[]) || []).includes(o)}
            onPick={(o) =>
              setAnswers((a) => {
                const arr = (a[field.id] as string[]) || [];
                if (o === 'None') return { ...a, [field.id]: ['None'] };
                const base = arr.filter((x) => x !== 'None');
                return { ...a, [field.id]: base.includes(o) ? base.filter((x) => x !== o) : [...base, o] };
              })
            }
          />
        )}
        {(field.type === 'text' || field.type === 'number') && (
          <input
            type={field.type}
            value={(val as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => set(field.id, e.target.value)}
            className={inputClass}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={spring}
        className="glass-strong ring-gradient w-full max-w-xl rounded-[2rem] p-7 shadow-glass-lg sm:p-9"
      >
        {/* header */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
              <Activity className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
            </span>
            <span className="text-[16px] font-bold tracking-tight text-ink">
              Maternal<span className="text-gradient">Care+</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
            <Sparkles className="h-3.5 w-3.5" /> {STAGE_LABEL[stage]}
          </span>
        </div>

        {!done && (
          <>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>
                Question {index + 1} of {total}
              </span>
              <span>{Math.round(((index + 1) / total) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-500"
                animate={{ width: `${((index + 1) / total) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </>
        )}

        {/* animated, resizing body */}
        <motion.div
          animate={{ height: h }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div ref={innerRef} className={done ? '' : 'pt-7'}>
            <motion.div
              key={done ? 'done' : index}
              initial={{ opacity: 0, x: done ? 0 : dir * 60, scale: done ? 0.94 : 1 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              {done ? (
                <div className="py-6 text-center">
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...spring, delay: 0.1 }}
                    className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow"
                  >
                    <Check className="h-8 w-8 text-white" strokeWidth={3} />
                  </motion.div>
                  <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
                    You’re all <span className="font-serif italic text-brand-600">set</span>
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-ink-soft">
                    Your care space is personalised and ready. Welcome to MaternalCare+.
                  </p>
                  <LiquidButton
                    size="lg"
                    className="mt-7 w-full"
                    onClick={() => navigate('/')}
                    iconRight={<ArrowRight className="h-[18px] w-[18px]" />}
                  >
                    Enter MaternalCare+
                  </LiquidButton>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
                      <step.icon className="h-5 w-5 text-white" strokeWidth={2} />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-ink">{step.title}</h2>
                      {step.subtitle && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.subtitle}</p>}
                    </div>
                  </div>
                  <div className="mt-6 space-y-5">
                    {step.custom === 'body-metrics' ? <BodyMetrics answers={answers} set={set} /> : step.fields.map(renderField)}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* nav */}
        {!done && (
          <div className="mt-8 flex items-center justify-between">
            {index > 0 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span />
            )}
            <LiquidButton size="lg" onClick={next} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
              {index < total - 1 ? 'Continue' : 'Finish'}
            </LiquidButton>
          </div>
        )}
      </motion.div>
    </div>
  );
}
