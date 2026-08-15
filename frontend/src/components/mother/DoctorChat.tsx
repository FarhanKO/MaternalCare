import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, MessageCircle, Send, ShieldAlert, Stethoscope } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import {
  messageStamp, type CareTeamMember, type Message, type MotherThread,
} from '@/data/care';

const C = { brand: '#3f66f0', violet: '#8b7bf3' };

/** Openers that give the doctor something concrete to answer. */
const STARTERS = [
  'I have a question about my medication',
  'Is what I am feeling normal?',
  'I need to move my appointment',
];

const initialsOf = (name: string) =>
  name.replace(/^Dr\.?\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');

/** "Dr. Lena Ortiz" → "Dr. Ortiz" — a bare surname reads too curt in copy. */
export const shortName = (name: string) => {
  const surname = name.replace(/^Dr\.?\s*/i, '').split(' ').slice(-1)[0];
  return /^Dr\.?\s/i.test(name) ? `Dr. ${surname}` : surname;
};

/* ------------------------------------------------------------ conversation */

function Conversation({
  doctor, onBack, onSent,
}: { doctor: CareTeamMember; onBack: () => void; onSent: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await api.getThread(doctor.doctorId));
    } catch {
      setMessages([]);
      setError('Could not load this conversation');
    }
  }, [doctor.doctorId]);

  useEffect(() => { load(); }, [load]);

  // keep the newest line in view as the thread grows
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const saved = await api.sendMessage(doctor.doctorId, body);
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
      className="flex h-[480px] flex-col"
    >
      <div className="flex items-center gap-2.5 border-b border-white/60 pb-3">
        <button onClick={onBack} aria-label="Back to conversations"
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="grid h-9 w-9 flex-none place-items-center rounded-2xl text-[11px] font-extrabold text-white"
          style={{ background: `linear-gradient(140deg, ${C.brand}, ${C.violet})` }}>
          {initialsOf(doctor.doctorName)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-ink">{doctor.doctorName}</div>
          <div className="truncate text-[11px] font-semibold text-ink-muted">{doctor.specialty}</div>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto py-3 pr-1">
        {messages === null && (
          <div className="py-8 text-center text-[12px] font-semibold text-ink-faint">Loading…</div>
        )}

        {messages?.length === 0 && (
          <div className="py-6 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-ink-faint" />
            <div className="mt-2 text-[12px] font-bold text-ink">No messages yet</div>
            <p className="mx-auto mt-1 max-w-xs text-[11px] text-ink-muted">
              Ask {shortName(doctor.doctorName)} anything about your care — replies usually
              come between clinics, not instantly.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => setDraft(s)}
                  className="rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-white">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((m) => {
          const mine = m.sender === 'mother';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5',
                mine ? 'bg-brand-500 text-white' : 'border border-white/60 bg-white/75 text-ink')}>
                <div className="whitespace-pre-wrap text-[12.5px] font-medium leading-relaxed">{m.body}</div>
                <div className={cn('mt-1 text-[10px] font-semibold',
                  mine ? 'text-white/70' : 'text-ink-faint')}>
                  {messageStamp(m.sentAt)}
                  {mine && (m.read ? ' · read' : ' · sent')}
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
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter starts a new line
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          rows={2}
          placeholder={`Write to ${shortName(doctor.doctorName)}…`}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/60 bg-white/75 px-3.5 py-2.5 text-[12.5px] font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className={cn('grid h-11 w-11 flex-none place-items-center rounded-2xl transition',
            draft.trim() && !sending
              ? 'bg-brand-500 text-white hover:bg-brand-600'
              : 'cursor-not-allowed bg-ink/8 text-ink-faint')}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-[10px] font-semibold text-ink-faint">
        Messages are not monitored around the clock. For anything urgent, use SOS or call your clinic.
      </p>
    </motion.div>
  );
}

/* ================================ section ================================ */

/** The mother's half of the conversation with her care team. */
export function DoctorChat() {
  const [team, setTeam] = useState<CareTeamMember[]>([]);
  const [threads, setThreads] = useState<MotherThread[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [open, setOpen] = useState<CareTeamMember | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, th] = await Promise.all([api.getCareTeam(), api.getThreads()]);
      setTeam(t);
      setThreads(th.threads);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadFor = (id: string) => threads.find((t) => t.doctorId === id)?.unread ?? 0;
  const lastFor = (id: string) => threads.find((t) => t.doctorId === id)?.lastMessage ?? null;

  // doctors she has already spoken to come first
  const ordered = [...team].sort((a, b) => {
    const la = lastFor(a.doctorId)?.sentAt ?? '';
    const lb = lastFor(b.doctorId)?.sentAt ?? '';
    return lb.localeCompare(la);
  });

  return (
    <Reveal>
      <GlassCard float className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: `${C.violet}1f`, color: C.violet }}>
            <MessageCircle className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink">Talk to your doctor</div>
            <div className="text-[11px] text-ink-muted">
              Ask questions between visits — your doctor answers here directly
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {open ? (
            <Conversation
              key={open.doctorId}
              doctor={open}
              onBack={() => { setOpen(null); load(); }}
              onSent={load}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="mt-3 space-y-2"
            >
              {state === 'loading' && (
                <div className="py-6 text-center text-[12px] font-semibold text-ink-faint">
                  Loading your care team…
                </div>
              )}

              {state === 'offline' && (
                <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-6 text-center">
                  <ShieldAlert className="mx-auto h-6 w-6 text-ink-faint" />
                  <p className="mt-2 text-[11px] font-semibold text-ink-muted">
                    Cannot reach the clinic — messages will load when it is back.
                  </p>
                </div>
              )}

              {state === 'ready' && ordered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-7 text-center">
                  <Stethoscope className="mx-auto h-6 w-6 text-ink-faint" />
                  <div className="mt-2 text-[12px] font-bold text-ink">No doctor to message yet</div>
                  <p className="mx-auto mt-1 max-w-sm text-[11px] text-ink-muted">
                    Request an appointment below. Once a doctor is looking after you, you can
                    message them here.
                  </p>
                </div>
              )}

              {ordered.map((c) => {
                const unread = unreadFor(c.doctorId);
                const last = lastFor(c.doctorId);
                return (
                  <button
                    key={c.doctorId}
                    onClick={() => setOpen(c)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5 text-left transition hover:bg-white"
                  >
                    <span className="relative grid h-10 w-10 flex-none place-items-center rounded-2xl text-[11px] font-extrabold text-white"
                      style={{ background: `linear-gradient(140deg, ${C.brand}, ${C.violet})` }}>
                      {initialsOf(c.doctorName)}
                      {unread > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                          {unread}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-ink">{c.doctorName}</span>
                        {last && (
                          <span className="flex-none text-[10px] font-semibold text-ink-faint">
                            {messageStamp(last.sentAt)}
                          </span>
                        )}
                      </div>
                      <div className={cn('truncate text-[11px]',
                        unread > 0 ? 'font-bold text-ink-soft' : 'font-medium text-ink-muted')}>
                        {last
                          ? `${last.sender === 'doctor' ? '' : 'You: '}${last.body}`
                          : c.specialty}
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </Reveal>
  );
}
