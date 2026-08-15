import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, FileText, Stethoscope, Trash2, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { fileUrl } from '@/lib/api';
import {
  DOC_META, prettyDate, prettySize, type CareDocument,
} from '@/data/care';

interface Props {
  /** the document to show, and the set it belongs to so the arrows can page */
  doc: CareDocument | null;
  siblings: CareDocument[];
  onClose: () => void;
  onSelect: (doc: CareDocument) => void;
  /** omitted for the clinician, who does not remove a mother's own uploads */
  onDelete?: (doc: CareDocument) => void;
}

/** Full-screen look at one prescription or report, with its own detail panel. */
export function DocumentViewer({ doc, siblings, onClose, onSelect, onDelete }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [doc?.id]);

  const index = doc ? siblings.findIndex((d) => d.id === doc.id) : -1;
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  useEffect(() => {
    if (!doc) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && prev) onSelect(prev);
      if (e.key === 'ArrowRight' && next) onSelect(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, prev, next, onClose, onSelect]);

  if (typeof document === 'undefined') return null;

  const isPdf = doc?.mime === 'application/pdf';

  return createPortal(
    <AnimatePresence>
      {doc && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.22 } }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/45"
            onClick={onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            role="dialog" aria-modal="true" aria-label={doc.title}
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-4xl shadow-float"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/50 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                    {DOC_META[doc.kind].label}
                  </span>
                  <h2 className="truncate text-lg font-extrabold tracking-tight text-ink">{doc.title}</h2>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />{prettyDate(doc.takenOn)}
                  </span>
                  <span>{prettySize(doc.size)}</span>
                  {doc.uploadedBy !== 'mother' && (
                    <span className="inline-flex items-center gap-1 text-peach-700">
                      <Stethoscope className="h-3 w-3" />filed by {doc.uploadedBy}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} aria-label="Close"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex-1 overflow-auto bg-ink/[0.04] p-4">
              {failed ? (
                <div className="grid h-64 place-items-center text-center">
                  <div>
                    <FileText className="mx-auto h-8 w-8 text-ink-faint" />
                    <p className="mt-2 text-[12px] font-semibold text-ink-muted">
                      This file could not be displayed.
                    </p>
                  </div>
                </div>
              ) : isPdf ? (
                <object
                  data={fileUrl(doc.url)}
                  type="application/pdf"
                  className="h-[60vh] w-full rounded-2xl bg-white"
                  aria-label={doc.title}
                >
                  <div className="grid h-64 place-items-center text-center text-[12px] font-semibold text-ink-muted">
                    Your browser cannot show PDFs inline.
                  </div>
                </object>
              ) : (
                <img
                  src={fileUrl(doc.url)}
                  alt={doc.title}
                  onError={() => setFailed(true)}
                  className="mx-auto max-h-[60vh] rounded-2xl bg-white object-contain shadow-lg"
                />
              )}

              {prev && (
                <button onClick={() => onSelect(prev)} aria-label="Previous document"
                  className="absolute left-6 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink-soft shadow-float transition hover:text-ink">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {next && (
                <button onClick={() => onSelect(next)} aria-label="Next document"
                  className="absolute right-6 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink-soft shadow-float transition hover:text-ink">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/50 px-5 py-3">
              <div className="min-w-0">
                {doc.note
                  ? <p className="truncate text-[12px] font-medium italic text-ink-soft">“{doc.note}”</p>
                  : <p className="text-[11px] font-semibold text-ink-faint">
                      {index + 1} of {siblings.length}
                    </p>}
              </div>
              {onDelete && doc.uploadedBy === 'mother' && (
                <button
                  onClick={() => onDelete(doc)}
                  className={cn('inline-flex items-center gap-1.5 rounded-xl border border-rose-300/70 bg-rose-500/10',
                    'px-3 py-2 text-[12px] font-bold text-rose-600 transition hover:bg-rose-500/15')}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
