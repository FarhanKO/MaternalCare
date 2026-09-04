import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Clock, MessageCircle, Plus, Send, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import {
  messageStamp, prettyTime, type DoctorThread, type Message, type UpcomingVisit,
} from '@/data/care';
import type { Patient } from '@/data/doctor';

const P = { peach: '#fb7534', peachDark: '#ea5c1d' };

const initialsOf = (name: string) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('');

interface Props {
  doctorId: string;
  /** the caseload, so a clinician can open a conversation first */
  roster: Patient[];
  onChange?: (unread: number) => void;
}

/* ------------------------------------------------------------ conversation */

function Conversation({
  doctorId, patientId, patientName, onBack, onSent,
}: {
  doctorId: string; patientId: string; patientName: string;
  onBack: () => void; onSent: () => void;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await api.getDoctorThread(doctorId, patientId));
    } catch {
      setMessages([]);
      setError('Could not load this conversation');
    }
  }, [doctorId, patientId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const saved = await api.sendAsDoctor(doctorId, patientId, body);
      setMessages((prev) => [...(prev ?? []), saved]);
      setDraft('');
      onSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      className="flex h-[460px] flex-col"
    >
      <div className="flex items-center gap-2.5 border-b border-white/60 pb-3">
        <button onClick={onBack} aria-label="Back to conversations"
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="grid h-9 w-9 flex-none place-items-center rounded-2xl text-[11px] font-extrabold text-white"
          style={{ background: `linear-gradient(140deg, ${P.peach}, ${P.peachDark})` }}>
          {initialsOf(patientName)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-ink">{patientName}</div>
          <div className="text-[11px] font-semibold text-ink-muted">She sees your replies immediately</div>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto py-3 pr-1">
        {messages === null && (
          <div className="py-8 text-center text-[12px] font-semibold text-ink-faint">Loading…</div>
        )}
        {messages?.length === 0 && (
          <div className="py-8 text-center text-[12px] font-semibold text-ink-muted">
            Nothing here yet — write the first message to {patientName.split(' ')[0]}.
          </div>
        )}

        {messages?.map((m) => {
          const mine = m.sender === 'doctor';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5',
                mine ? 'bg-peach-500 text-white' : 'border border-white/60 bg-white/75 text-ink')}>
                <div className="whitespace-pre-wrap text-[12.5px] font-medium leading-relaxed">{m.body}</div>
                <div className={cn('mt-1 text-[10px] font-semibold', mine ? 'text-white/75' : 'text-ink-faint')}>
                  {messageStamp(m.sentAt)}{mine && (m.read ? ' · read' : ' · sent')}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="mb-2 rounded-xl bg-rose-500/12 px-3 py-2 text-[11px] font-bold text-rose-700 ring-1 ring-rose-500/25">
          {error}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-white/60 pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder={`Reply to ${patientName.split(' ')[0]}…`}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/60 bg-white/75 px-3.5 py-2.5 text-[12.5px] font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-peach-400 focus:ring-2 focus:ring-peach-500/20"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className={cn('grid h-11 w-11 flex-none place-items-center rounded-2xl transition',
            draft.trim() && !sending
              ? 'bg-peach-500 text-white hover:bg-peach-600'
              : 'cursor-not-allowed bg-ink/8 text-ink-faint')}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ================================ section ================================ */

/** Conversations with the mothers on this clinician's caseload. */
export function MessageThreads({ doctorId, roster, onChange }: Props) {
  const [threads, setThreads] = useState<DoctorThread[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);

  const [imminent, setImminent] = useState<UpcomingVisit[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await api.getDoctorThreads(doctorId);
      setThreads(r.threads);
      setState('ready');
      onChange?.(r.unread);
    } catch {
      setState('offline');
    }
    // onChange is recreated each render; depending on it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Visits about to start.
   *
   * Computed on read rather than pushed by a scheduler, and shown here rather
   * than written into the conversation — the patient does not need to watch
   * her clinician being reminded. Re-checked on a slow poll so a clinician who
   * leaves the tab open still sees it arrive.
   */
  useEffect(() => {
    let cancelled = false;
    const check = () => api.getDoctorUpcoming(doctorId)
      .then((v) => { if (!cancelled) setImminent(v); })
      .catch(() => { if (!cancelled) setImminent([]); });

    check();
    const id = window.setInterval(check, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [doctorId]);

  // patients with no conversation yet, so the clinician can start one
  const talkedTo = new Set(threads.map((t) => t.patientId));
  const newContacts = roster.filter((p) => !talkedTo.has(p.id));

  return (
    <Reveal>
      <GlassCard float className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: `${P.peach}1f`, color: P.peach }}>
              <MessageCircle className="h-[18px] w-[18px]" />
            </span>
            <div>
              <div className="text-sm font-bold text-ink">Conversations</div>
              <div className="text-[11px] text-ink-muted">Answer questions between appointments</div>
            </div>
          </div>

          {imminent.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              <Clock className="h-3.5 w-3.5" /> {imminent.length} starting soon
            </span>
          )}

          {!open && newContacts.length > 0 && (
            <button
              onClick={() => setPicking((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-[12px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
            >
              {picking ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {picking ? 'Close' : 'New message'}
            </button>
          )}
        </div>

        {/*
          The one thing a clinician must do before an appointment starts, said
          where they are already looking, with the instruction attached rather
          than assumed.
        */}
        {imminent.length > 0 && (
          <div className="mt-3 space-y-2">
            {imminent.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-amber-500/12 px-3.5 py-3 ring-1 ring-amber-500/30"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-extrabold text-amber-900">
                  <Clock className="h-4 w-4 flex-none" />
                  You have an appointment with {v.patientName}
                  <span className="font-bold text-amber-800">· {prettyTime(v.time)}</span>
                </div>
                <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-amber-800/90">
                  Ready your meeting link — paste the Google Meet, Zoom or WhatsApp link into{' '}
                  {v.patientName.split(' ')[0]}&rsquo;s chat box below. She cannot send one herself.
                </p>
                <button
                  onClick={() => setOpen({ id: v.patientId, name: v.patientName })}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500/25 px-3 py-1.5 text-[11.5px] font-bold text-amber-900 transition hover:bg-amber-500/35"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Open her chat
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <Conversation
              key={open.id}
              doctorId={doctorId}
              patientId={open.id}
              patientName={open.name}
              onBack={() => { setOpen(null); load(); }}
              onSent={load}
            />
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }} className="mt-3 space-y-2">

              <AnimatePresence>
                {picking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-white/60 bg-white/55 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                        Start a conversation with
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {newContacts.map((p) => (
                          <button key={p.id}
                            onClick={() => { setOpen({ id: p.id, name: p.name }); setPicking(false); }}
                            className="rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-white">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {state === 'loading' && (
                <div className="py-6 text-center text-[12px] font-semibold text-ink-faint">Loading…</div>
              )}
              {state === 'offline' && (
                <div className="py-6 text-center text-[12px] font-semibold text-ink-muted">
                  Cannot reach the server — conversations will load when it is back.
                </div>
              )}
              {state === 'ready' && threads.length === 0 && (
                <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-7 text-center">
                  <MessageCircle className="mx-auto h-6 w-6 text-ink-faint" />
                  <div className="mt-2 text-[12px] font-bold text-ink">No conversations yet</div>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Mothers can write to you once you are looking after them — or start one yourself.
                  </p>
                </div>
              )}

              {threads.map((t) => (
                <button
                  key={t.patientId}
                  onClick={() => setOpen({ id: t.patientId, name: t.patientName })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5 text-left transition hover:bg-white"
                >
                  <span className="relative grid h-10 w-10 flex-none place-items-center rounded-2xl text-[11px] font-extrabold text-white"
                    style={{ background: `linear-gradient(140deg, ${P.peach}, ${P.peachDark})` }}>
                    {initialsOf(t.patientName)}
                    {t.unread > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                        {t.unread}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-bold text-ink">{t.patientName}</span>
                      {t.lastMessage && (
                        <span className="flex-none text-[10px] font-semibold text-ink-faint">
                          {messageStamp(t.lastMessage.sentAt)}
                        </span>
                      )}
                    </div>
                    <div className={cn('truncate text-[11px]',
                      t.unread > 0 ? 'font-bold text-ink-soft' : 'font-medium text-ink-muted')}>
                      {t.lastMessage
                        ? `${t.lastMessage.sender === 'doctor' ? 'You: ' : ''}${t.lastMessage.body}`
                        : '—'}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </Reveal>
  );
}
