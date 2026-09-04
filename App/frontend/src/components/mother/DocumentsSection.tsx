import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Check, ChevronDown, FileText, Image as ImageIcon, Pill, Stethoscope,
  TestTube, Wand2, X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { FileUpload } from '@/components/ui/FileUpload';
import { DocumentViewer } from '@/components/mother/DocumentViewer';
import { cn } from '@/lib/cn';
import { api, fileUrl } from '@/lib/api';
import { detectDate, todayISO, type DetectedDate } from '@/lib/fileDate';
import {
  DOC_META, groupByDate, prettySize, type CareDocument, type DocumentKind,
} from '@/data/care';

const KIND_ICON = { prescription: Pill, report: TestTube };
const KIND_TINT = { prescription: '#8b7bf3', report: '#22b8c4' };

interface Staged { file: File; dataUrl: string; detected: DetectedDate }

/**
 * A readable first guess at the title, from the file name. The date is shown
 * in its own field, so strip it out rather than repeating it in the label.
 */
function titleFromName(name: string) {
  // \b is no use here: `_` counts as a word character, so it never fires
  // against `report_2026-03-15`. Guard on digits instead.
  const base = name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/(?<!\d)20\d{2}[-_.]\d{1,2}[-_.]\d{1,2}(?!\d)/g, ' ')     // 2026-03-15
    .replace(/(?<!\d)\d{1,2}[-_.\/]\d{1,2}[-_.\/]20\d{2}(?!\d)/g, ' ') // 15-03-2026
    .replace(/(?<!\d)20\d{6}(?!\d)/g, ' ')                             // 20260315
    .replace(/(?<!\d)\d{6}(?!\d)/g, ' ')                               // a bare time stamp
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // camera names like "IMG 20260315 101500" say nothing worth showing
  if (!base || /^(img|dsc|photo|scan|document)\b/i.test(base) || /^[\d\s]+$/.test(base)) return '';
  return base.slice(0, 60);
}

/* --------------------------------------------------------------- timeline */

function Timeline({
  docs, onOpen,
}: { docs: CareDocument[]; onOpen: (d: CareDocument) => void }) {
  const years = useMemo(() => groupByDate(docs), [docs]);
  // the newest year is open; older ones fold away so a long history stays short
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {years.map((y, yi) => {
        const shut = collapsed[y.year] ?? yi > 0;
        return (
          <div key={y.year}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [y.year]: !shut }))}
              className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-white/50"
            >
              <ChevronDown className={cn('h-4 w-4 flex-none text-ink-faint transition-transform',
                shut && '-rotate-90')} />
              <span className="text-sm font-extrabold tracking-tight text-ink">{y.year}</span>
              <span className="text-[11px] font-semibold text-ink-faint">
                {y.count} item{y.count === 1 ? '' : 's'}
              </span>
              <span className="ml-1 h-px flex-1 bg-ink/10" />
            </button>

            <AnimatePresence initial={false}>
              {!shut && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-2">
                    {y.months.map((m) => (
                      <div key={m.key}>
                        <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                          {m.label} · {m.count}
                        </div>

                        {/* one rail down the month, a node per day */}
                        <div className="mt-1.5 space-y-2.5 border-l border-ink/10 pl-4">
                          {m.days.map((d) => (
                            <div key={d.day} className="relative">
                              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-brand-400" />
                              <div className="text-[11px] font-bold text-ink-soft">{d.label}</div>

                              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                {d.items.map((doc) => {
                                  const Icon = KIND_ICON[doc.kind];
                                  const isImage = doc.mime.startsWith('image/');
                                  return (
                                    <button
                                      key={doc.id}
                                      onClick={() => onOpen(doc)}
                                      className="group flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/60 p-2 text-left transition hover:bg-white"
                                    >
                                      <span className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-xl bg-ink/5">
                                        {isImage ? (
                                          <img src={fileUrl(doc.url)} alt=""
                                            className="h-full w-full object-cover" loading="lazy" />
                                        ) : (
                                          <FileText className="h-5 w-5 text-ink-faint" />
                                        )}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[12px] font-bold text-ink">
                                          {doc.title}
                                        </span>
                                        <span className="flex flex-wrap items-center gap-x-1.5 text-[10px] font-semibold text-ink-faint">
                                          <Icon className="h-3 w-3" style={{ color: KIND_TINT[doc.kind] }} />
                                          {prettySize(doc.size)}
                                          {doc.uploadedBy !== 'mother' && (
                                            <span className="text-peach-700">· {doc.uploadedBy}</span>
                                          )}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- one kind */

function KindPanel({
  kind, docs, onUploaded, onOpen,
}: {
  kind: DocumentKind;
  docs: CareDocument[];
  onUploaded: () => void;
  onOpen: (d: CareDocument) => void;
}) {
  const [title, setTitle] = useState('');
  const [takenOn, setTakenOn] = useState(todayISO());
  const [pending, setPending] = useState<Staged | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const Icon = KIND_ICON[kind];
  const meta = DOC_META[kind];

  /**
   * A picked file waits here rather than uploading straight away, so she can
   * see the date we worked out and correct it before it is filed.
   */
  const stage = async (file: File, dataUrl: string) => {
    const detected = await detectDate(file);
    setPending({ file, dataUrl, detected });
    setTakenOn(detected.date);
    setTitle((t) => t || titleFromName(file.name));
  };

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    setError('');
    try {
      await api.uploadDocument({
        kind,
        title: title.trim() || meta.label,
        dataUrl: pending.dataUrl,
        originalName: pending.file.name,
        takenOn,
      });
      setPending(null);
      setTitle('');
      setTakenOn(todayISO());
      onUploaded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setPending(null);
    setTitle('');
    setError('');
    setTakenOn(todayISO());
  };

  return (
    <GlassCard float className="p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: `${KIND_TINT[kind]}1f`, color: KIND_TINT[kind] }}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink">{meta.plural}</div>
          <div className="text-[11px] text-ink-muted">{meta.hint}</div>
        </div>
        <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
          {docs.length}
        </span>
      </div>

      <div className="mt-3">
        <AnimatePresence mode="wait">
          {pending ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className="rounded-3xl border border-brand-500/25 bg-brand-500/[0.06] p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-xl bg-white/70">
                  {pending.file.type.startsWith('image/')
                    ? <img src={pending.dataUrl} alt="" className="h-full w-full object-cover" />
                    : <FileText className="h-5 w-5 text-ink-faint" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold text-ink">{pending.file.name}</div>
                  <div className="text-[10px] font-semibold text-ink-faint">
                    {prettySize(pending.file.size)}
                  </div>
                </div>
                <button onClick={discard} aria-label="Discard this file"
                  className="grid h-7 w-7 flex-none place-items-center rounded-lg text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === 'prescription' ? 'e.g. Iron tablets — Dr. Ortiz' : 'e.g. Full blood count'}
                aria-label={`What this ${meta.label.toLowerCase()} is`}
                className="mt-2.5 h-10 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 text-[12px] font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />

              {/* the detected date, always correctable — we never read the
                  printed date off the paper, so this is a suggestion */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 rounded-2xl border border-white/60 bg-white/80 px-3">
                  <CalendarDays className="h-3.5 w-3.5 flex-none text-ink-faint" />
                  <input
                    type="date"
                    value={takenOn}
                    max={todayISO()}
                    onChange={(e) => setTakenOn(e.target.value)}
                    aria-label={`Date on the ${meta.label.toLowerCase()}`}
                    className="h-9 bg-transparent text-[12px] font-semibold text-ink outline-none"
                  />
                </label>
                <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold',
                  takenOn === pending.detected.date ? 'text-brand-700' : 'text-ink-faint')}>
                  {takenOn === pending.detected.date ? (
                    <><Wand2 className="h-3 w-3" /> Dated {pending.detected.label}</>
                  ) : 'Date set by you'}
                </span>
              </div>

              {error && (
                <div className="mt-2 rounded-xl bg-rose-500/12 px-3 py-2 text-[11px] font-bold text-rose-700 ring-1 ring-rose-500/25">
                  {error}
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-end gap-2">
                <button onClick={discard}
                  className="rounded-xl px-3 py-2 text-[12px] font-bold text-ink-muted transition hover:text-ink">
                  Cancel
                </button>
                <button
                  onClick={confirm}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" /> {saving ? 'Adding…' : 'Add to record'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <FileUpload
                onFile={stage}
                accent="brand"
                label={`Add a ${meta.label.toLowerCase()}`}
                hint={kind === 'prescription' ? 'Photograph the paper slip' : 'Photo or PDF of the result'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4">
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-5 text-center">
            <ImageIcon className="mx-auto h-5 w-5 text-ink-faint" />
            <p className="mt-1.5 text-[11px] font-semibold text-ink-muted">
              No {meta.plural.toLowerCase()} added yet.
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
              Anything you add is filed by its own date.
            </p>
          </div>
        ) : (
          <Timeline docs={docs} onOpen={onOpen} />
        )}
      </div>
    </GlassCard>
  );
}

/* ================================ section ================================ */

/** Where a mother keeps her prescriptions and reports, each on its own shelf. */
export function DocumentsSection() {
  const [docs, setDocs] = useState<CareDocument[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [open, setOpen] = useState<CareDocument | null>(null);

  const load = useCallback(async () => {
    try {
      setDocs((await api.getDocuments()).documents);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const prescriptions = docs.filter((d) => d.kind === 'prescription');
  const reports = docs.filter((d) => d.kind === 'report');
  const siblings = open ? docs.filter((d) => d.kind === open.kind) : [];

  const remove = async (doc: CareDocument) => {
    setOpen(null);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id)); // optimistic
    try { await api.deleteDocument(doc.id); } finally { load(); }
  };

  return (
    <>
      <Reveal>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/12 text-brand-600">
            <FileText className="h-[18px] w-[18px]" />
          </span>
          <div>
            <div className="text-sm font-bold text-ink">Your prescriptions &amp; reports</div>
            <div className="text-[11px] text-ink-muted">
              Photograph them as you get them — your doctor can open every one
            </div>
          </div>
        </div>
      </Reveal>

      {state === 'offline' ? (
        <GlassCard className="p-6 text-center">
          <Stethoscope className="mx-auto h-7 w-7 text-ink-faint" />
          <p className="mt-2 text-[12px] font-semibold text-ink-muted">
            Cannot reach the clinic right now — your files are safe and will appear when it is back.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <KindPanel kind="prescription" docs={prescriptions} onUploaded={load} onOpen={setOpen} />
          </Reveal>
          <Reveal delay={0.08}>
            <KindPanel kind="report" docs={reports} onUploaded={load} onOpen={setOpen} />
          </Reveal>
        </div>
      )}

      <DocumentViewer
        doc={open}
        siblings={siblings}
        onClose={() => setOpen(null)}
        onSelect={setOpen}
        onDelete={remove}
      />
    </>
  );
}
