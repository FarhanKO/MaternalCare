import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, FileText, FolderOpen, Pill, Stethoscope, TestTube, Upload, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api, fileUrl } from '@/lib/api';
import { DocumentViewer } from '@/components/mother/DocumentViewer';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  groupByDate, prettyDate, prettySize, type CareDocument, type DocumentKind,
} from '@/data/care';

const TABS: { key: DocumentKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'report', label: 'Reports' },
];

const KIND_ICON = { prescription: Pill, report: TestTube };
const KIND_TINT = { prescription: '#8b7bf3', report: '#22b8c4' };

const pad = (n: number) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Filename → a first-guess title, the same way the mother's panel does it. */
const titleFromName = (name: string) =>
  name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 60) || 'Untitled';

/**
 * The patient's record of paper: everything she has photographed, plus
 * anything the clinic has filed for her — newest first, grouped by the date on
 * the document rather than the day it was uploaded.
 *
 * This used to be a cramped footnote at the bottom of the record panel. It now
 * owns a pane of its own, because "what has she been prescribed, and what did
 * the last scan say" is usually the reason the record was opened at all.
 */
export function PatientFiles({
  patientId, patientName, onCount,
}: {
  patientId: string;
  patientName?: string;
  /** lets the panel's tab show a count without fetching twice */
  onCount?: (n: number) => void;
}) {
  const [docs, setDocs] = useState<CareDocument[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [tab, setTab] = useState<DocumentKind | 'all'>('all');
  const [open, setOpen] = useState<CareDocument | null>(null);

  /* what the clinician is in the middle of filing */
  const [pending, setPending] = useState<{ file: File; dataUrl: string } | null>(null);
  const [kind, setKind] = useState<DocumentKind>('report');
  const [title, setTitle] = useState('');
  const [takenOn, setTakenOn] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { documents } = await api.getPatientDocuments(patientId);
      setDocs(documents);
      onCount?.(documents.length);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, [patientId, onCount]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(
    () => (tab === 'all' ? docs : docs.filter((d) => d.kind === tab)),
    [docs, tab],
  );
  const years = useMemo(() => groupByDate(shown), [shown]);

  const counts = {
    all: docs.length,
    prescription: docs.filter((d) => d.kind === 'prescription').length,
    report: docs.filter((d) => d.kind === 'report').length,
  };

  const stage = (file: File, dataUrl: string) => {
    setPending({ file, dataUrl });
    setTitle(titleFromName(file.name));
    setTakenOn(todayISO());
    setError(null);
  };

  const discard = () => { setPending(null); setError(null); };

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await api.uploadPatientDocument(patientId, {
        kind,
        title: title.trim() || titleFromName(pending.file.name),
        dataUrl: pending.dataUrl,
        originalName: pending.file.name,
        takenOn,
        uploadedBy: 'clinic',
      });
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not file that document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* filters */}
      {docs.length > 0 && (
        <div className="flex flex-none gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn('flex-1 rounded-xl px-2 py-2 text-[11.5px] font-bold ring-1 transition',
                tab === t.key
                  ? 'bg-peach-500/15 text-peach-700 ring-peach-500/25'
                  : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink')}
            >
              {t.label}
              <span className="ml-1 font-semibold opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      )}

      {state === 'loading' && (
        <div className="py-8 text-center text-[12px] font-semibold text-ink-faint">Loading files…</div>
      )}
      {state === 'offline' && (
        <div className="py-8 text-center text-[12px] font-semibold text-ink-muted">
          Could not load this patient&apos;s files.
        </div>
      )}

      {state === 'ready' && docs.length === 0 && (
        <div className="rounded-3xl border border-dashed border-ink/15 px-4 py-8 text-center">
          <FolderOpen className="mx-auto h-7 w-7 text-ink-faint" />
          <p className="mt-2 text-[13px] font-bold text-ink-soft">Nothing filed yet</p>
          <p className="mx-auto mt-1 max-w-[16rem] text-[11.5px] font-medium leading-relaxed text-ink-muted">
            Prescriptions and results {patientName ? `${patientName.split(' ')[0]} photographs` : 'she photographs'}{' '}
            appear here automatically, newest first. You can also file one yourself below.
          </p>
        </div>
      )}

      {state === 'ready' && docs.length > 0 && shown.length === 0 && (
        <p className="mt-4 text-center text-[12px] font-semibold text-ink-muted">
          No {tab === 'prescription' ? 'prescriptions' : 'reports'} on this record.
        </p>
      )}

      {/* the timeline */}
      <div className="mt-3 flex-1 space-y-4 overflow-y-auto">
        {years.map((y) => (
          <div key={y.year}>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-extrabold text-ink">{y.year}</span>
              <span className="h-px flex-1 bg-ink/10" />
              <span className="text-[10px] font-bold text-ink-faint">{y.count}</span>
            </div>

            {y.months.map((m) => (
              <div key={m.key} className="mt-3">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
                  {m.label}
                </div>
                <div className="mt-2 space-y-3 border-l border-ink/10 pl-4">
                  {m.days.map((d) => (
                    <div key={d.day} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-peach-400" />
                      <div className="text-[11px] font-bold text-ink-soft">{prettyDate(d.day)}</div>
                      <div className="mt-1.5 space-y-2">
                        {d.items.map((doc) => {
                          const Icon = KIND_ICON[doc.kind];
                          const isImage = doc.mime.startsWith('image/');
                          return (
                            <button
                              key={doc.id}
                              onClick={() => setOpen(doc)}
                              className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/60 p-2 text-left transition hover:bg-white"
                            >
                              <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-xl bg-ink/5">
                                {isImage
                                  // eager: these are thumbnails inside a short scroll
                                  // pane, so deferring them just shows empty boxes
                                  ? <img src={fileUrl(doc.url)} alt=""
                                      className="h-full w-full object-cover" />
                                  : <FileText className="h-5 w-5 text-ink-faint" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold text-ink">{doc.title}</span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-faint">
                                  <Icon className="h-3.5 w-3.5" style={{ color: KIND_TINT[doc.kind] }} />
                                  {prettySize(doc.size)}
                                </span>
                                <span className={cn(
                                  'mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                                  doc.uploadedBy === 'mother'
                                    ? 'bg-brand-500/10 text-brand-700'
                                    : 'bg-peach-500/12 text-peach-700',
                                )}>
                                  {doc.uploadedBy === 'mother'
                                    ? 'from the patient'
                                    : <><Stethoscope className="h-2.5 w-2.5" /> filed by {doc.uploadedBy}</>}
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
        ))}
      </div>

      {/* filing something onto the record */}
      {state === 'ready' && (
        <div className="mt-3 flex-none border-t border-white/50 pt-3">
          <AnimatePresence mode="wait">
            {pending ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                className="rounded-3xl border border-peach-500/25 bg-peach-500/[0.06] p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-xl bg-white/70">
                    {pending.file.type.startsWith('image/')
                      ? <img src={pending.dataUrl} alt="" className="h-full w-full object-cover" />
                      : <FileText className="h-5 w-5 text-ink-faint" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-ink">{pending.file.name}</div>
                    <div className="text-[10px] font-semibold text-ink-faint">{prettySize(pending.file.size)}</div>
                  </div>
                  <button onClick={discard} aria-label="Discard this file"
                    className="grid h-7 w-7 flex-none place-items-center rounded-lg text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 flex gap-1.5">
                  {(['report', 'prescription'] as DocumentKind[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={cn('flex-1 rounded-xl px-2 py-1.5 text-[11px] font-bold ring-1 transition',
                        kind === k
                          ? 'bg-peach-500/15 text-peach-700 ring-peach-500/25'
                          : 'bg-white/70 text-ink-muted ring-transparent hover:text-ink')}
                    >
                      {k === 'report' ? 'Report' : 'Prescription'}
                    </button>
                  ))}
                </div>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === 'report' ? 'e.g. 32-week growth scan' : 'e.g. Iron + folate'}
                  aria-label="What this document is"
                  className="mt-2 h-10 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 text-[12px] font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-peach-400 focus:ring-2 focus:ring-peach-500/20"
                />

                <input
                  type="date"
                  value={takenOn}
                  max={todayISO()}
                  onChange={(e) => setTakenOn(e.target.value)}
                  aria-label="Date on the document"
                  className="mt-2 h-10 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 text-[12px] font-semibold text-ink outline-none focus:border-peach-400"
                />

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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-peach-500 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-peach-600 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" /> {saving ? 'Filing…' : 'File on record'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                <FileUpload
                  onFile={stage}
                  accent="peach"
                  label="File a result on this record"
                  hint="A scan, a lab result, or a prescription you issued"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <DocumentViewer doc={open} siblings={shown} onClose={() => setOpen(null)} onSelect={setOpen} />
    </div>
  );
}

/** The small marker the record panel puts on its Files tab. */
export function FilesTabIcon() {
  return <Upload className="h-3.5 w-3.5" />;
}
