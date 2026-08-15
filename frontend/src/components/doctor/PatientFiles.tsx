import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Pill, TestTube } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api, fileUrl } from '@/lib/api';
import { DocumentViewer } from '@/components/mother/DocumentViewer';
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

/**
 * Everything this patient has photographed or had filed for her, newest
 * first and grouped by the date on the document. Read-only: a clinician
 * does not delete a mother's own uploads.
 */
export function PatientFiles({ patientId }: { patientId: string }) {
  const [docs, setDocs] = useState<CareDocument[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [tab, setTab] = useState<DocumentKind | 'all'>('all');
  const [open, setOpen] = useState<CareDocument | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setDocs((await api.getPatientDocuments(patientId)).documents);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, [patientId]);

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

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          Prescriptions &amp; reports
        </div>
        <span className="text-[11px] font-semibold text-ink-muted">{docs.length}</span>
      </div>

      <div className="mt-2 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn('flex-1 rounded-xl px-2 py-1.5 text-[11px] font-bold ring-1 transition',
              tab === t.key
                ? 'bg-peach-500/15 text-peach-700 ring-peach-500/25'
                : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink')}
          >
            {t.label}
            <span className="ml-1 font-semibold opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {state === 'loading' && (
        <div className="mt-3 py-4 text-center text-[11px] font-semibold text-ink-faint">Loading files…</div>
      )}
      {state === 'offline' && (
        <div className="mt-3 py-4 text-center text-[11px] font-semibold text-ink-muted">
          Could not load this patient's files.
        </div>
      )}
      {state === 'ready' && shown.length === 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-ink/15 px-3 py-5 text-center">
          <FileText className="mx-auto h-5 w-5 text-ink-faint" />
          <p className="mt-1.5 text-[11px] font-semibold text-ink-muted">
            She has not uploaded anything in this category yet.
          </p>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {years.map((y) => (
          <div key={y.year}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-ink">{y.year}</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            {y.months.map((m) => (
              <div key={m.key} className="mt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  {m.label}
                </div>
                <div className="mt-1.5 space-y-2 border-l border-ink/10 pl-3.5">
                  {m.days.map((d) => (
                    <div key={d.day} className="relative">
                      <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-peach-400" />
                      <div className="text-[10px] font-bold text-ink-soft">{prettyDate(d.day)}</div>
                      <div className="mt-1 space-y-1.5">
                        {d.items.map((doc) => {
                          const Icon = KIND_ICON[doc.kind];
                          const isImage = doc.mime.startsWith('image/');
                          return (
                            <button
                              key={doc.id}
                              onClick={() => setOpen(doc)}
                              className="flex w-full items-center gap-2.5 rounded-xl border border-white/60 bg-white/60 p-1.5 text-left transition hover:bg-white"
                            >
                              <span className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-lg bg-ink/5">
                                {isImage
                                  ? <img src={fileUrl(doc.url)} alt="" loading="lazy"
                                      className="h-full w-full object-cover" />
                                  : <FileText className="h-4 w-4 text-ink-faint" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12px] font-bold text-ink">{doc.title}</span>
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-faint">
                                  <Icon className="h-3 w-3" style={{ color: KIND_TINT[doc.kind] }} />
                                  {prettySize(doc.size)}
                                  {doc.uploadedBy !== 'mother' && ` · ${doc.uploadedBy}`}
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

      <DocumentViewer doc={open} siblings={shown} onClose={() => setOpen(null)} onSelect={setOpen} />
    </div>
  );
}
