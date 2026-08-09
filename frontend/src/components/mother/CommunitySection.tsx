import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  BadgeCheck, BookOpen, Heart, MessageCircle, Plus, Search, ShieldCheck, Users,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';

const C = { brand: '#3f66f0', rose: '#f2789f', mint: '#2fbf9b', violet: '#8b7bf3', peach: '#fb7534' };

interface Post {
  id: string;
  author: string;
  role: 'mother' | 'midwife' | 'doctor';
  week?: number;
  topic: string;
  title: string;
  body: string;
  replies: number;
  hearts: number;
  clinicianAnswered: boolean;
  ago: string;
}

const TOPICS = ['All', 'Second trimester', 'Sleep', 'Nutrition', 'Symptoms', 'Birth prep'];

const POSTS: Post[] = [
  {
    id: 'p1', author: 'Nusrat J.', role: 'mother', week: 27, topic: 'Sleep',
    title: 'Anyone else waking up at 3am every night?',
    body: 'I fall asleep fine but wake around 3am and can’t settle again. Side-lying with a pillow helps a little. What worked for you?',
    replies: 14, hearts: 32, clinicianAnswered: true, ago: '2h',
  },
  {
    id: 'p2', author: 'Dr. Lena Ortiz', role: 'doctor', topic: 'Second trimester',
    title: 'Why movement patterns matter more than kick counts',
    body: 'From week 28, what matters is your baby’s usual pattern — not hitting a magic number. If the pattern changes, call the same day. Never wait until morning.',
    replies: 9, hearts: 61, clinicianAnswered: true, ago: '6h',
  },
  {
    id: 'p3', author: 'Farhana R.', role: 'mother', week: 25, topic: 'Nutrition',
    title: 'Iron tablets making me nauseous — alternatives?',
    body: 'Taking them on an empty stomach was a mistake. My midwife suggested taking them with orange juice at night instead. Sharing in case it helps someone.',
    replies: 21, hearts: 47, clinicianAnswered: false, ago: '1d',
  },
  {
    id: 'p4', author: 'Sister Amina', role: 'midwife', topic: 'Birth prep',
    title: 'What to actually pack in your hospital bag (week 34 checklist)',
    body: 'Most lists are far too long. You need documents, a phone charger, comfortable clothes and something for baby to go home in. Everything else is optional.',
    replies: 33, hearts: 88, clinicianAnswered: true, ago: '2d',
  },
  {
    id: 'p5', author: 'Priya S.', role: 'mother', week: 26, topic: 'Symptoms',
    title: 'Back ache that won’t go away after a week',
    body: 'Warm compress helps for an hour then it returns. Logging it daily in the app made it easier to explain to my midwife how long it had lasted.',
    replies: 7, hearts: 19, clinicianAnswered: false, ago: '3d',
  },
];

const ROLE_META = {
  mother: { label: 'Mother', color: C.rose },
  midwife: { label: 'Midwife', color: C.mint },
  doctor: { label: 'Doctor', color: C.brand },
};

const GUIDELINES = [
  'Every clinical answer is reviewed by a registered midwife or doctor.',
  'Share experiences, not prescriptions — never advise someone to change medication.',
  'Urgent symptoms belong with your care team, not the forum.',
];

export function CommunitySection({ week }: { week: number }) {
  const [topic, setTopic] = useState('All');
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POSTS.filter((p) =>
      (topic === 'All' || p.topic === topic) &&
      (!q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)),
    );
  }, [topic, query]);

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Community</h2>
        <p className="text-sm text-ink-muted">
          Mothers at your stage, with midwives and doctors answering — moderated and clinician-reviewed.
        </p>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* feed */}
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
                <LiquidButton icon={<Plus className="h-[18px] w-[18px]" />}>Ask a question</LiquidButton>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      topic === t
                        ? 'border-brand-500/40 bg-brand-500/15 text-brand-700'
                        : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          {/* posts */}
          <div className="mt-4 space-y-4">
            {posts.map((p, i) => {
              const role = ROLE_META[p.role];
              const isLiked = liked[p.id];
              return (
                <Reveal key={p.id} delay={i * 0.04}>
                  <GlassCard interactive className="p-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-full text-[12px] font-bold text-white"
                        style={{ background: role.color }}
                      >
                        {p.author.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <span className="text-sm font-bold text-ink">{p.author}</span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ background: `${role.color}1f`, color: role.color }}
                          >
                            {role.label}
                          </span>
                          {p.week && (
                            <span className="text-[11px] font-semibold text-ink-faint">
                              week {p.week}
                              {p.week === week && ' · same as you'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-ink-faint">{p.topic} · {p.ago} ago</div>
                      </div>
                      {p.clinicianAnswered && (
                        <span className="inline-flex flex-none items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/25">
                          <BadgeCheck className="h-3 w-3" /> Clinician answered
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-[15px] font-bold leading-snug text-ink">{p.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.body}</p>

                    <div className="mt-4 flex items-center gap-4">
                      <button
                        onClick={() => setLiked((l) => ({ ...l, [p.id]: !l[p.id] }))}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
                          isLiked ? 'text-rose-600' : 'text-ink-muted hover:text-ink',
                        )}
                      >
                        <motion.span animate={{ scale: isLiked ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.3 }}>
                          <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
                        </motion.span>
                        {p.hearts + (isLiked ? 1 : 0)}
                      </button>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                        <MessageCircle className="h-4 w-4" /> {p.replies} replies
                      </span>
                    </div>
                  </GlassCard>
                </Reveal>
              );
            })}

            {posts.length === 0 && (
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
                {[
                  { n: '1,284', l: 'Mothers' },
                  { n: '36', l: 'Clinicians' },
                  { n: '92%', l: 'Answered' },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-white/60 bg-white/55 py-3">
                    <div className="text-lg font-extrabold text-ink">{s.n}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{s.l}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.05}>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.mint}1f`, color: C.mint }}>
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </span>
                <div className="text-sm font-bold text-ink">How this space works</div>
              </div>
              <ul className="mt-3 space-y-2">
                {GUIDELINES.map((g) => (
                  <li key={g} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-ink-faint" />
                    {g}
                  </li>
                ))}
              </ul>
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
                {[
                  'Sleeping safely in the third trimester',
                  'Iron, and why it peaks from here',
                  'Understanding your glucose screening',
                ].map((a) => (
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
