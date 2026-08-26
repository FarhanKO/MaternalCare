import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, Brain, Check, ChevronDown, Info, ScrollText, ServerOff,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { RiskView } from '@/data/records';
import { useT } from '@/i18n';

/**
 * Her risk, read two ways.
 *
 * The React app had no risk screen at all — the assessment existed only on the
 * server-rendered pages and inside the PDF, so the primary interface of this
 * project could not show the number the whole proposal is built around.
 *
 * It shows both engines and resolves neither. The rules are hand-written,
 * cautious, and can name the reading behind every point they award. The model
 * is a random forest trained on 451 records from Bangladeshi clinics: it has
 * seen real pregnancies and cannot explain itself at all. Presenting one as
 * the answer would waste the thing that makes having both worthwhile — that
 * when they disagree, the disagreement is itself the finding.
 */

const TONE = {
  low: { text: 'text-emerald-700', bg: 'bg-emerald-500/12', ring: 'ring-emerald-500/25', bar: 'bg-emerald-500' },
  medium: { text: 'text-amber-700', bg: 'bg-amber-500/12', ring: 'ring-amber-500/25', bar: 'bg-amber-500' },
  high: { text: 'text-rose-700', bg: 'bg-rose-500/12', ring: 'ring-rose-500/25', bar: 'bg-rose-500' },
} as const;

export function RiskPanel() {
  const { t } = useT();
  const [risk, setRisk] = useState<(RiskView & { service: { up: boolean; trainedOnRows: number | null } }) | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [showFactors, setShowFactors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getRisk()
      .then((r) => { if (!cancelled) { setRisk(r); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('offline'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading' || state === 'offline' || !risk?.rules) {
    return (
      <div className="mt-9">
        <GlassCard className="p-6">
          <p className="py-6 text-center text-[12px] font-semibold text-ink-faint">
            {state === 'loading' ? t('common.loading') : t('plan.needsRecord')}
          </p>
        </GlassCard>
      </div>
    );
  }

  const { rules, model, comparison } = risk;
  const rt = TONE[rules.level];
  const contributing = rules.factors.filter((f) => f.points > 0);

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{t('risk.title')}</h2>
        <p className="text-sm text-ink-muted">{t('risk.subtitle')}</p>
      </Reveal>

      {/* where they disagree, said first */}
      {comparison.agreement === 'model-higher' && (
        <Reveal className="mb-4">
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/25">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
            <div>
              <div className="text-[13px] font-extrabold text-ink">{t('risk.disagree')}</div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{comparison.note}</p>
            </div>
          </div>
        </Reveal>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* the rules */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className={cn('grid h-9 w-9 place-items-center rounded-xl', rt.bg, rt.text)}>
                <ScrollText className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">{t('risk.rules.name')}</div>
                <div className="text-xs text-ink-muted">{t('risk.rules.sub')}</div>
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className={cn('text-3xl font-extrabold tracking-tight', rt.text)}>
                {rules.label}
              </span>
              <span className="text-[12px] font-bold text-ink-faint">{rules.score}/100</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div
                className={cn('h-full rounded-full', rt.bar)}
                initial={{ width: 0 }}
                animate={{ width: `${rules.score}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            {/* the part a classifier cannot do */}
            <button
              onClick={() => setShowFactors((v) => !v)}
              className="mt-4 flex w-full items-center justify-between rounded-xl px-1 py-1 text-[12px] font-bold text-ink-soft transition hover:text-ink"
            >
              {t('risk.rules.what')}
              <ChevronDown className={cn('h-4 w-4 transition-transform', showFactors && 'rotate-180')} />
            </button>

            {showFactors && (
              <div className="mt-1 space-y-1.5">
                {rules.factors.map((f) => (
                  <div
                    key={f.name}
                    className={cn(
                      'rounded-xl border border-white/60 px-3 py-2',
                      f.points > 0 ? 'bg-white/70' : 'bg-white/40',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-bold text-ink">{f.name}</span>
                      <span className={cn('text-[11px] font-bold',
                        f.points > 0 ? 'text-amber-700' : 'text-ink-faint')}
                      >
                        {f.points > 0 ? `+${f.points}` : '0'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{f.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {!showFactors && contributing.length > 0 && (
              <p className="mt-1 text-[11.5px] font-semibold text-ink-faint">
                {contributing.map((f) => f.name.toLowerCase()).join(', ')}
              </p>
            )}
          </GlassCard>
        </Reveal>

        {/* the model */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className={cn('grid h-9 w-9 place-items-center rounded-xl',
                model?.available ? TONE[model.level!].bg : 'bg-ink/[0.06]',
                model?.available ? TONE[model.level!].text : 'text-ink-faint')}
              >
                <Brain className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">{t('risk.model.name')}</div>
                <div className="text-xs text-ink-muted">
                  {t('risk.model.sub', { n: risk.service.trainedOnRows ?? 0 })}
                </div>
              </div>
            </div>

            {/* the service is optional, and its absence has to read as an absence */}
            {!model && (
              <div className="mt-5 rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-center">
                <ServerOff className="mx-auto h-6 w-6 text-ink-faint" />
                <div className="mt-2 text-[12.5px] font-bold text-ink">{t('risk.model.down')}</div>
                <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-ink-muted">
                  {t('risk.model.downNote')}
                </p>
              </div>
            )}

            {model?.refused && (
              <div className="mt-5 rounded-2xl bg-ink/[0.04] px-4 py-4">
                <Info className="h-5 w-5 text-ink-faint" />
                <div className="mt-2 text-[12.5px] font-bold text-ink">
                  {t('risk.model.outside')}
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{model.reason}</p>
              </div>
            )}

            {model?.available && (
              <>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={cn('text-3xl font-extrabold tracking-tight', TONE[model.level!].text)}>
                    {model.label}
                  </span>
                  <span className="text-[12px] font-bold text-ink-faint">
                    {t('risk.model.sure', { n: Math.round((model.confidence ?? 0) * 100) })}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {(['high', 'medium', 'low'] as const).map((k) => (
                    <div key={k}>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-bold capitalize text-ink-soft">{k}</span>
                        <span className="font-bold text-ink-muted">
                          {Math.round((model.probabilities?.[k] ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                        <motion.div
                          className={cn('h-full rounded-full', TONE[k].bar)}
                          initial={{ width: 0 }}
                          animate={{ width: `${(model.probabilities?.[k] ?? 0) * 100}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/*
                  What it had to assume. A prediction resting on a stood-in
                  value should not look like one resting on a measurement.
                */}
                {((model.imputed?.length ?? 0) > 0 || (model.clamped?.length ?? 0) > 0) && (
                  <p className="mt-3 rounded-xl bg-ink/[0.04] px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
                    {(model.imputed?.length ?? 0) > 0 && <>{t('risk.model.assumedPulse')} </>}
                    {(model.clamped?.length ?? 0) > 0 && <>{t('risk.model.clamped')}</>}
                  </p>
                )}

                {model.quality && (
                  <p className="mt-2 text-[10.5px] font-medium leading-relaxed text-ink-faint">
                    Scores {Math.round((model.quality.test_accuracy ?? 0) * 100)}% accurate on
                    held-out records. {model.quality.caveat}
                  </p>
                )}
              </>
            )}
          </GlassCard>
        </Reveal>
      </div>

      {comparison.agreement === 'agree' && (
        <Reveal className="mt-4">
          <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
            <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" strokeWidth={3} />
            <p className="text-[12px] font-semibold leading-relaxed text-ink-soft">
              {comparison.note}
            </p>
          </div>
        </Reveal>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[10.5px] font-medium leading-relaxed text-ink-faint">
        <Activity className="mt-0.5 h-3 w-3 flex-none" />
        {t('risk.disclaimer')}
      </p>
    </div>
  );
}
