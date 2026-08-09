import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import {
  BadgeCheck, BookOpen, Heart, ImagePlus, MessageCircle, Plus, Search, Send, ShieldCheck,
  Users, X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';

const C = { brand: '#3f66f0', rose: '#f2789f', mint: '#2fbf9b', violet: '#8b7bf3', peach: '#fb7534' };

type Role = 'mother' | 'midwife' | 'doctor';

interface Comment {
  id: string;
  author: string;
  role: Role;
  body: string;
  ago: string;
}

interface Post {
  id: string;
  author: string;
  role: Role;
  week?: number;
  topic: string;
  title: string;
  body: string;
  image?: string;
  hearts: number;
  clinicianAnswered: boolean;
  ago: string;
  comments: Comment[];
}

const TOPICS = ['Second trimester', 'Sleep', 'Nutrition', 'Symptoms', 'Birth prep'];
const FILTERS = ['All', ...TOPICS];

/** Community rules surfaced while composing. */
const RULES = [
  'Be respectful — everyone here is going through something.',
  'Share your experience, not a prescription.',
  'Never tell someone to start or stop medication.',
  'Urgent symptoms belong with your care team, not the forum.',
  'Keep other people’s details private.',
];

const SEED: Post[] = [
  {
    id: 'p1', author: 'Nusrat J.', role: 'mother', week: 27, topic: 'Sleep',
    title: 'Anyone else waking up at 3am every night?',
    body: 'I fall asleep fine but wake around 3am and can’t settle again. Side-lying with a pillow helps a little. What worked for you?',
    hearts: 32, clinicianAnswered: true, ago: '2h',
    comments: [
      { id: 'c1', author: 'Sister Amina', role: 'midwife', body: 'Very common in the third trimester. Keep the room dark and avoid checking the time — it raises alertness. If you are awake past 30 minutes, get up briefly rather than lying there.', ago: '1h' },
      { id: 'c2', author: 'Priya S.', role: 'mother', body: 'A pillow under the bump as well as between the knees was what finally worked for me.', ago: '40m' },
    ],
  },
  {
    id: 'p2', author: 'Dr. Lena Ortiz', role: 'doctor', topic: 'Second trimester',
    title: 'Why movement patterns matter more than kick counts',
    body: 'From week 28, what matters is your baby’s usual pattern — not hitting a magic number. If the pattern changes, call the same day. Never wait until morning.',
    hearts: 61, clinicianAnswered: true, ago: '6h',
    comments: [
      { id: 'c3', author: 'Farhana R.', role: 'mother', body: 'Thank you for saying this. I was stressing about reaching ten every day.', ago: '5h' },
    ],
  },
  {
    id: 'p3', author: 'Farhana R.', role: 'mother', week: 25, topic: 'Nutrition',
    title: 'Iron tablets making me nauseous — alternatives?',
    body: 'Taking them on an empty stomach was a mistake. My midwife suggested taking them with orange juice at night instead. Sharing in case it helps someone.',
    hearts: 47, clinicianAnswered: false, ago: '1d',
    comments: [],
  },
  {
    id: 'p4', author: 'Sister Amina', role: 'midwife', topic: 'Birth prep',
    title: 'What to actually pack in your hospital bag (week 34 checklist)',
    body: 'Most lists are far too long. You need documents, a phone charger, comfortable clothes and something for baby to go home in. Everything else is optional.',
    hearts: 88, clinicianAnswered: true, ago: '2d',
    comments: [],
  },
];

const ROLE_META: Record<Role, { label: string; color: string }> = {
  mother: { label: 'Mother', color: C.rose },
  midwife: { label: 'Midwife', color: C.mint },
  doctor: { label: 'Doctor', color: C.brand },
};

const uid = () => `x-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('');

function Avatar({ name, role, size = 9 }: { name: string; role: Role; size?: number }) {
  return (
    <span
      className={cn('grid flex-none place-items-center rounded-full text-[11px] font-bold text-white',
        size === 9 ? 'h-9 w-9' : 'h-7 w-7 text-[10px]')}
      style={{ background: ROLE_META[role].color }}
    >
      {initials(name)}
    </span>
  );
}

/** The rules panel that appears while composing. */
function RulesNote({ compact }: { compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: compact ? 0 : 12, y: compact ? -8 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: compact ? 0 : 12, y: compact ? -8 : 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-brand-200/70 bg-brand-50/70 p-4 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 text-[12px] font-extrabold text-brand-700">
        <ShieldCheck className="h-4 w-4" /> Before you post
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {RULES.map((r) => (
          <li key={r} className="flex gap-2 text-[11px] leading-relaxed text-ink-soft">
            <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-brand-400" />{r}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] font-medium leading-relaxed text-ink-faint">
        Posts are moderated. Clinical answers are reviewed by a registered midwife or doctor.
      </p>
    </motion.div>
  );
}

export function CommunitySection({ week }: { week: number }) {
  const [posts, setPosts] = useState<Post[]>(SEED);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // composer
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) =>
      (filter === 'All' || p.topic === filter) &&
      (!q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)),
    );
  }, [posts, filter, query]);

  const pickImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const resetComposer = () => {
    setComposing(false); setTitle(''); setBody(''); setImage(null); setTopic(TOPICS[0]);
  };

  const publish = () => {
    if (!title.trim() && !body.trim()) return;
    setPosts((p) => [{
      id: uid(), author: 'Aisha R.', role: 'mother', week, topic,
      title: title.trim() || 'Untitled',
      body: body.trim(),
      image: image ?? undefined,
      hearts: 0, clinicianAnswered: false, ago: 'just now', comments: [],
    }, ...p]);
    resetComposer();
  };

  const addComment = (postId: string) => {
    const text = (drafts[postId] || '').trim();
    if (!text) return;
    setPosts((all) => all.map((p) => p.id === postId
      ? { ...p, comments: [...p.comments, { id: uid(), author: 'Aisha R.', role: 'mother', body: text, ago: 'just now' }] }
      : p));
    setDrafts((d) => ({ ...d, [postId]: '' }));
  };

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Community</h2>
        <p className="text-sm text-ink-muted">
          Mothers at your stage, with midwives and doctors answering — moderated and clinician-reviewed.
        </p>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {/* search + ask */}
          <Reveal>
            <GlassCard className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search questions and experiences…"
                    className="h-11 w-full rounded-2xl border border-white/60 bg-white/70 pl-10 pr-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <LiquidButton
                  onClick={() => setComposing((v) => !v)}
                  icon={composing ? <X className="h-[18px] w-[18px]" /> : <Plus className="h-[18px] w-[18px]" />}
                >
                  {composing ? 'Cancel' : 'Ask a question'}
                </LiquidButton>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {FILTERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      filter === t ? 'border-brand-500/40 bg-brand-500/15 text-brand-700'
                        : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          {/* composer — rules appear alongside */}
          <AnimatePresence>
            {composing && (
              <motion.div
                key="composer"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_18rem]">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name="Aisha R." role="mother" />
                      <div>
                        <div className="text-sm font-bold text-ink">Aisha R.</div>
                        <div className="text-[11px] font-semibold text-ink-faint">Week {week} · posting as a mother</div>
                      </div>
                    </div>

                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Your question in one line…"
                      className="mt-4 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-bold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                    />
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={4}
                      placeholder="Add the details — what you’ve tried, how long it’s been…"
                      className="mt-2 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                    />

                    {/* image preview */}
                    <AnimatePresence>
                      {image && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                          className="relative mt-3 overflow-hidden rounded-2xl border border-white/60"
                        >
                          <img src={image} alt="Attached" className="max-h-64 w-full object-cover" />
                          <button
                            onClick={() => setImage(null)}
                            aria-label="Remove image"
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-ink/60 text-white backdrop-blur-md transition hover:bg-ink/80"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickImage(e.target.files?.[0])}
                      />
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-xs font-bold text-ink-soft transition hover:bg-white hover:text-ink"
                      >
                        <ImagePlus className="h-4 w-4" /> {image ? 'Change photo' : 'Add photo'}
                      </button>

                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-xs font-bold text-ink-soft outline-none transition hover:bg-white focus:border-brand-400"
                      >
                        {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>

                      <div className="ml-auto flex gap-2">
                        <LiquidButton variant="ghost" size="sm" onClick={resetComposer}>Cancel</LiquidButton>
                        <LiquidButton size="sm" onClick={publish} icon={<Send className="h-4 w-4" />}>Post</LiquidButton>
                      </div>
                    </div>
                  </GlassCard>

                  <RulesNote />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* posts */}
          <div className="mt-4 space-y-4">
            <AnimatePresence initial={false}>
              {visible.map((p) => {
                const role = ROLE_META[p.role];
                const isLiked = liked[p.id];
                const threadOpen = openThread === p.id;
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  >
                    <GlassCard className="p-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.author} role={p.role} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-1.5">
                            <span className="text-sm font-bold text-ink">{p.author}</span>
                            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ background: `${role.color}1f`, color: role.color }}>
                              {role.label}
                            </span>
                            {p.week && (
                              <span className="text-[11px] font-semibold text-ink-faint">
                                week {p.week}{p.week === week && ' · same as you'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-ink-faint">{p.topic} · {p.ago}</div>
                        </div>
                        {p.clinicianAnswered && (
                          <span className="inline-flex flex-none items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/25">
                            <BadgeCheck className="h-3 w-3" /> Clinician answered
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-[15px] font-bold leading-snug text-ink">{p.title}</h3>
                      {p.body && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.body}</p>}

                      {p.image && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-white/60">
                          <img src={p.image} alt="" className="max-h-80 w-full object-cover" />
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-4">
                        <button
                          onClick={() => setLiked((l) => ({ ...l, [p.id]: !l[p.id] }))}
                          className={cn('inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
                            isLiked ? 'text-rose-600' : 'text-ink-muted hover:text-ink')}
                        >
                          <motion.span animate={{ scale: isLiked ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.3 }}>
                            <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
                          </motion.span>
                          {p.hearts + (isLiked ? 1 : 0)}
                        </button>

                        <button
                          onClick={() => setOpenThread(threadOpen ? null : p.id)}
                          className={cn('inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
                            threadOpen ? 'text-brand-600' : 'text-ink-muted hover:text-ink')}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {p.comments.length} {p.comments.length === 1 ? 'reply' : 'replies'}
                        </button>
                      </div>

                      {/* comment thread */}
                      <AnimatePresence>
                        {threadOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-2.5 border-t border-white/60 pt-4">
                              {p.comments.map((c) => (
                                <motion.div
                                  key={c.id} layout
                                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                  className="flex gap-2.5 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5"
                                >
                                  <Avatar name={c.author} role={c.role} size={7} />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-1.5">
                                      <span className="text-[12px] font-bold text-ink">{c.author}</span>
                                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                                        style={{ background: `${ROLE_META[c.role].color}1f`, color: ROLE_META[c.role].color }}>
                                        {ROLE_META[c.role].label}
                                      </span>
                                      <span className="text-[10px] font-medium text-ink-faint">{c.ago}</span>
                                    </div>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{c.body}</p>
                                  </div>
                                </motion.div>
                              ))}

                              {p.comments.length === 0 && (
                                <p className="text-[12px] font-medium text-ink-faint">
                                  No replies yet — be the first to help.
                                </p>
                              )}

                              {/* add a comment */}
                              <div className="flex items-center gap-2 pt-1">
                                <Avatar name="Aisha R." role="mother" size={7} />
                                <input
                                  value={drafts[p.id] || ''}
                                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && addComment(p.id)}
                                  placeholder="Write a kind reply…"
                                  className="h-10 flex-1 rounded-2xl border border-white/60 bg-white/70 px-3.5 text-[13px] font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                />
                                <button
                                  onClick={() => addComment(p.id)}
                                  disabled={!(drafts[p.id] || '').trim()}
                                  aria-label="Post reply"
                                  className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow transition disabled:opacity-40"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              </div>

                              <p className="pt-1 text-[10px] font-medium text-ink-faint">
                                Be respectful. Share experience, not medical advice.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {visible.length === 0 && (
              <div className="rounded-3xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm font-medium text-ink-faint">
                No posts match that search.
              </div>
            )}
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          <Reveal>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.violet}1f`, color: C.violet }}>
                  <Users className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">Your week group</div>
                  <div className="text-xs text-ink-muted">Week {week} · second trimester</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[{ n: '1,284', l: 'Mothers' }, { n: '36', l: 'Clinicians' }, { n: '92%', l: 'Answered' }].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-white/60 bg-white/55 py-3">
                    <div className="text-lg font-extrabold text-ink">{s.n}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{s.l}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.1}>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.peach}1f`, color: C.peach }}>
                  <BookOpen className="h-[18px] w-[18px]" />
                </span>
                <div className="text-sm font-bold text-ink">Reading for week {week}</div>
              </div>
              <div className="mt-3 space-y-2">
                {['Sleeping safely in the third trimester', 'Iron, and why it peaks from here', 'Understanding your glucose screening'].map((a) => (
                  <button key={a} className="w-full rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5 text-left text-[12px] font-semibold text-ink-soft transition hover:bg-white hover:text-ink">
                    {a}
                  </button>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
