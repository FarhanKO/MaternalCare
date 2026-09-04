import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Check, EyeOff, Flag, Loader2, MessageSquare, ShieldCheck, X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api, fileUrl } from '@/lib/api';
import type { ReportGroup } from '@/data/records';

/**
 * The moderation queue.
 *
 * The community board has told mothers it is "moderated · clinician-reviewed"
 * since it was written, and until now no clinician could see a single report
 * because there was no way to file one. This is the other end of that.
 *
 * Grouped by the item reported, not by report: three people reporting one post
 * is one decision, and seeing the three reasons side by side is usually what
 * makes the decision obvious.
 */

const STATES = [
  { key: 'open', label: 'Waiting' },
  { key: 'upheld', label: 'Removed' },
  { key: 'dismissed', label: 'Kept' },
] as const;

type State = (typeof STATES)[number]['key'];

function Group({
  group, doctorId, onDone,
}: {
  group: ReportGroup;
  doctorId: string | null;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'uphold' | 'dismiss' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (action: 'uphold' | 'dismiss') => {
    setBusy(action);
    setError(null);
    try {
      await api.resolveReport(group.target, group.commentId ?? group.postId, {
        action,
        note: note.trim() || undefined,
        doctorId: doctorId ?? undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That decision could not be saved');
      setBusy(null);
    }
  };

  const open = group.reports.some((r) => r.state === 'open');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'rounded-3xl border p-4',
        group.urgent ? 'border-rose-300 bg-rose-500/[0.05]' : 'border-white/60 bg-white/60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          {group.target === 'post'
            ? <><Flag className="h-3 w-3" /> Post</>
            : <><MessageSquare className="h-3 w-3" /> Reply</>}
        </span>
        {group.urgent && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
            <AlertTriangle className="h-3 w-3" /> Read first
          </span>
        )}
        {group.content.hidden && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            <EyeOff className="h-3 w-3" /> Removed
          </span>
        )}
        <span className="ml-auto text-[11px] font-semibold text-ink-faint">
          {group.reports.length} report{group.reports.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* the content itself, so nobody has to go and find it */}
      <div className="mt-3 rounded-2xl bg-white/70 p-3.5">
        <div className="text-[11px] font-bold text-ink-muted">
          {group.content.author}
          {group.content.role === 'doctor' && (
            <span className="ml-1.5 rounded-full bg-brand-500/12 px-1.5 py-0.5 text-[9px] text-brand-700">
              clinician
            </span>
          )}
        </div>
        {group.content.title && (
          <div className="mt-1 text-[13.5px] font-extrabold text-ink">{group.content.title}</div>
        )}
        {group.content.body && (
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{group.content.body}</p>
        )}
        {group.content.image && (
          <img
            src={fileUrl(group.content.image)}
            alt=""
            className="mt-2 max-h-48 w-full rounded-xl object-cover"
          />
        )}
      </div>

      {/* why people reported it */}
      <div className="mt-3 space-y-1.5">
        {group.reports.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/60 bg-white/50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11.5px] font-bold text-ink">{r.reasonLabel}</span>
              <span className="text-[10.5px] font-semibold text-ink-faint">· {r.reporter}</span>
              {r.state !== 'open' && (
                <span className="rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-muted">
                  {r.state}
                </span>
              )}
            </div>
            {r.detail && (
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">“{r.detail}”</p>
            )}
            {r.reviewNote && (
              <p className="mt-0.5 text-[11px] italic text-ink-faint">Decision: {r.reviewNote}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-[11.5px] font-semibold text-rose-600">{error}</p>
      )}

      {/* a decision that is not recorded is not a decision */}
      {(open || group.content.hidden) && (
        <div className="mt-3 space-y-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="Why — the author and the next reviewer both see this"
            className="w-full rounded-2xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-[12.5px] text-ink outline-none transition focus:border-brand-300 focus:bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => decide('dismiss')}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/60 bg-white/70 py-2.5 text-[12.5px] font-bold text-ink-soft transition hover:bg-white hover:text-ink disabled:opacity-60"
            >
              {busy === 'dismiss' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {group.content.hidden ? 'Put it back' : 'Leave it up'}
            </button>
            <button
              onClick={() => decide('uphold')}
              disabled={busy !== null || group.content.hidden}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {busy === 'uphold' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Take it down
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function ModerationQueue({ doctorId }: { doctorId: string | null }) {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [open, setOpen] = useState(0);
  const [state, setState] = useState<State>('open');
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const r = await api.getReports(state);
      setGroups(r.groups);
      setOpen(r.open);
      setStatus('ready');
    } catch {
      setStatus('offline');
    }
  }, [state]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Reported content</h2>
          {open > 0 && (
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-700">
              {open} waiting
            </span>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          What mothers have flagged on the community board. Unsafe advice about medication
          is weighted highest and sorts to the top.
        </p>
      </Reveal>

      <Reveal>
        <GlassCard className="p-5 sm:p-6">
          <div className="flex gap-1.5">
            {STATES.map((t) => (
              <button
                key={t.key}
                onClick={() => setState(t.key)}
                className={cn('flex-1 rounded-xl px-2 py-2 text-[11.5px] font-bold ring-1 transition',
                  state === t.key
                    ? 'bg-brand-500/12 text-brand-700 ring-brand-500/20'
                    : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {status === 'loading' && (
            <p className="py-10 text-center text-[12px] font-semibold text-ink-faint">Loading…</p>
          )}
          {status === 'offline' && (
            <p className="py-10 text-center text-[12px] font-semibold text-ink-muted">
              The moderation queue is not reachable right now.
            </p>
          )}

          {status === 'ready' && groups.length === 0 && (
            <div className="py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-ink">
                {state === 'open' ? 'Nothing waiting' : 'Nothing here'}
              </p>
              <p className="mt-1 text-[12px] text-ink-muted">
                {state === 'open'
                  ? 'The board is clear. Reports from mothers arrive here.'
                  : 'No decisions of this kind yet.'}
              </p>
            </div>
          )}

          <div className="mt-3 space-y-2.5">
            <AnimatePresence initial={false}>
              {groups.map((g) => (
                <Group key={g.key} group={g} doctorId={doctorId} onDone={load} />
              ))}
            </AnimatePresence>
          </div>
        </GlassCard>
      </Reveal>
    </div>
  );
}
