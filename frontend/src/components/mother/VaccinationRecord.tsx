import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, Baby, Check, FileText, Loader2, Paperclip, Syringe, User,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api, fileUrl } from '@/lib/api';
import { DocumentViewer } from '@/components/mother/DocumentViewer';
import { prettyDate, prettySize, type CareDocument } from '@/data/care';
import type { Vaccination, VaccinationStats } from '@/data/records';

/**
 * The digital vaccination record.
 *
 * Two halves, and only one of them existed in this app. Marking a dose
 * complete was reachable through the API but had no screen here; filing the
 * card that proves it went into the general document store with nothing tying
 * it to the dose, so a clinician reading the record could see a claim and not
 * its evidence. Both live here now, on the same row.
 */

const SUBJECT = {
  mother: { label: 'For you', icon: User },
  child: { label: 'For baby', icon: Baby },
} as const;

const STATUS = {
  done: { label: 'Done', chip: 'bg-emerald-500/15 text-emerald-700' },
  due: { label: 'Due', chip: 'bg-rose-500/12 text-rose-700' },
  upcoming: { label: 'Upcoming', chip: 'bg-brand-500/10 text-brand-700' },
} as const;

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/** Reads a chosen file into the data URL the API expects. */
const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('That file could not be read'));
  reader.readAsDataURL(file);
});

function Dose({
  v, onDone, onCard, onOpenCard, busy,
}: {
  v: Vaccination;
  onDone: (id: string) => void;
  onCard: (id: string, file: File) => void;
  onOpenCard: (doc: CareDocument) => void;
  busy: string | null;
}) {
  const meta = SUBJECT[v.subject] ?? SUBJECT.mother;
  const status = STATUS[v.status];
  const working = busy === v.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/60 bg-white/60 p-3"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-amber-500/15 text-amber-600">
          <Syringe className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13.5px] font-extrabold text-ink">{v.name}</span>
            {v.dose && <span className="text-[11px] font-semibold text-ink-muted">{v.dose}</span>}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', status.chip)}>
              {status.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint">
            <meta.icon className="h-3 w-3" />
            {meta.label}
            <span aria-hidden>·</span>
            {v.status === 'done' && v.completedOn
              ? `given ${prettyDate(v.completedOn)}`
              : `due ${prettyDate(v.dueDate)}`}
          </div>
        </div>

        <div className="flex flex-none items-center gap-1.5">
          {v.status !== 'done' && (
            <button
              onClick={() => onDone(v.id)}
              disabled={working}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Mark done
            </button>
          )}

          {/* the card is the proof; it belongs on the same row as the claim */}
          <label
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-xl border border-white/70 bg-white/70 px-2.5 py-1.5 text-[11px] font-bold text-ink-soft transition hover:bg-white hover:text-ink',
              working && 'pointer-events-none opacity-60',
            )}
          >
            {working
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Paperclip className="h-3.5 w-3.5" />}
            Card
            <input
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';           // so the same file can be re-picked
                if (file) onCard(v.id, file);
              }}
            />
          </label>
        </div>
      </div>

      {/* what has been filed against this dose */}
      {v.cards.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/60 pt-2.5">
          {v.cards.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenCard(c)}
              className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/70 p-1 pr-2.5 text-left transition hover:bg-white"
            >
              <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-lg bg-ink/5">
                {c.mime.startsWith('image/')
                  ? <img src={fileUrl(c.url)} alt="" className="h-full w-full object-cover" />
                  : <FileText className="h-3.5 w-3.5 text-ink-faint" />}
              </span>
              <span className="min-w-0">
                <span className="block max-w-[10rem] truncate text-[11px] font-bold text-ink">
                  {c.title}
                </span>
                <span className="block text-[9.5px] font-semibold text-ink-faint">
                  {prettySize(c.size)} · filed {prettyDate(c.takenOn)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function VaccinationRecord() {
  const [list, setList] = useState<Vaccination[]>([]);
  const [stats, setStats] = useState<VaccinationStats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<CareDocument | null>(null);
  const [who, setWho] = useState<'all' | 'mother' | 'child'>('all');

  const load = useCallback(async () => {
    try {
      const r = await api.getVaccinations();
      setList(r.rows);
      setStats(r.stats);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDone = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const r = await api.markVaccinationDone(id);
      setList(r.rows);
      setStats(r.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update that dose');
    } finally {
      setBusy(null);
    }
  };

  const attach = async (id: string, file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('Cards must be 5 MB or smaller');
      return;
    }
    setBusy(id);
    try {
      const dataUrl = await toDataUrl(file);
      const r = await api.uploadVaccinationCard(id, { dataUrl, originalName: file.name });
      setList(r.rows);
      setStats(r.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not file that card');
    } finally {
      setBusy(null);
    }
  };

  const shown = who === 'all' ? list : list.filter((v) => v.subject === who);
  const cardCount = list.reduce((n, v) => n + v.cards.length, 0);

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Vaccination record</h2>
        <p className="text-sm text-ink-muted">
          Mark each dose as it is given, and keep the card that proves it on the same row.
        </p>
      </Reveal>

      <Reveal>
        <GlassCard className="p-5 sm:p-6">
          {/* coverage */}
          {stats && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[8rem] flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-ink">{stats.pct}%</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                    complete
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-aqua-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.pct}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <div className="flex gap-4 text-center">
                {[
                  { n: stats.done, l: 'done' },
                  { n: stats.due, l: 'due' },
                  { n: cardCount, l: cardCount === 1 ? 'card filed' : 'cards filed' },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-lg font-extrabold text-ink">{s.n}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* whose doses */}
          <div className="mt-4 flex gap-1.5">
            {([
              { k: 'all', label: 'All' },
              { k: 'mother', label: 'For you' },
              { k: 'child', label: 'For baby' },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setWho(t.k)}
                className={cn('flex-1 rounded-xl px-2 py-2 text-[11.5px] font-bold ring-1 transition',
                  who === t.k
                    ? 'bg-amber-500/15 text-amber-700 ring-amber-500/25'
                    : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink')}
              >
                {t.label}
                <span className="ml-1 font-semibold opacity-70">
                  {t.k === 'all' ? list.length : list.filter((v) => v.subject === t.k).length}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 ring-1 ring-rose-500/25">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
              <span className="text-[12px] font-semibold text-ink-soft">{error}</span>
            </div>
          )}

          {state === 'loading' && (
            <p className="py-8 text-center text-[12px] font-semibold text-ink-faint">Loading the record…</p>
          )}
          {state === 'offline' && (
            <p className="py-8 text-center text-[12px] font-semibold text-ink-muted">
              Cannot reach the clinic right now — your record is safe.
            </p>
          )}

          <div className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
              {shown.map((v) => (
                <Dose
                  key={v.id}
                  v={v}
                  busy={busy}
                  onDone={markDone}
                  onCard={attach}
                  onOpenCard={setOpen}
                />
              ))}
            </AnimatePresence>
          </div>

          <p className="mt-3 text-[10.5px] font-medium leading-relaxed text-ink-faint">
            Cards are stored with the rest of your documents and appear in your health report.
            A photograph of the paper card is enough.
          </p>
        </GlassCard>
      </Reveal>

      <DocumentViewer
        doc={open}
        siblings={list.flatMap((v) => v.cards)}
        onClose={() => setOpen(null)}
        onSelect={setOpen}
      />
    </div>
  );
}
