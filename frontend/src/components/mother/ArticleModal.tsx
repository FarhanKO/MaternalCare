import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, BookOpen, Clock, X } from 'lucide-react';
import type { Article, DiagramKind } from '@/data/reading';

const INK = '#2f3a5c';
const ACCENT = '#3f66f0';
const SOFT = '#f2789f';

/* ---------------- hand-drawn style diagrams ---------------- */
const stroke = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Diagram({ kind }: { kind: DiagramKind }) {
  const draw = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const },
  };

  if (kind === 'side-sleep') {
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        {/* bed */}
        <motion.path d="M14 128 H306" {...stroke} strokeWidth={3} {...draw} />
        {/* pillow under head */}
        <motion.path d="M30 116 q-4 -20 16 -21 q22 -1 22 12 q0 9 -10 9 z" {...stroke} {...draw} />
        {/* head */}
        <motion.circle cx="62" cy="90" r="15" {...stroke} {...draw} />
        {/* back line */}
        <motion.path d="M77 84 q46 -6 88 6 q16 5 22 14" {...stroke} {...draw} />
        {/* front of torso + bump */}
        <motion.path d="M76 102 q26 6 44 4" {...stroke} {...draw} />
        <motion.path d="M120 106 a24 22 0 0 0 44 6" {...stroke} stroke={SOFT} strokeWidth={2.5} {...draw} />
        {/* arm resting forward */}
        <motion.path d="M96 96 q26 6 34 20" {...stroke} {...draw} />
        {/* upper leg bent, pillow between knees */}
        <motion.path d="M187 106 q28 6 34 20" {...stroke} {...draw} />
        <motion.path d="M187 116 q26 12 30 26" {...stroke} {...draw} />
        <motion.ellipse cx="232" cy="120" rx="17" ry="11" {...stroke} stroke={ACCENT} {...draw} />
        {/* lower leg */}
        <motion.path d="M249 122 q22 -2 30 6" {...stroke} {...draw} />
        {/* labels */}
        <text x="252" y="102" fontSize="9.5" fill={ACCENT} fontWeight="700" textAnchor="middle">pillow between</text>
        <text x="252" y="112" fontSize="9.5" fill={ACCENT} fontWeight="700" textAnchor="middle">the knees</text>
        <text x="150" y="140" fontSize="9.5" fill={SOFT} fontWeight="700" textAnchor="middle">support the bump</text>
        <text x="62" y="42" fontSize="10" fill={INK} opacity="0.55" fontWeight="700" textAnchor="middle">either side</text>
        <motion.path d="M62 48 v10" {...stroke} strokeWidth={1.5} opacity={0.4} {...draw} />
      </svg>
    );
  }

  if (kind === 'iron') {
    const bars = [
      { l: 'Iron alone', v: 34, c: '#c6d9ff' },
      { l: '+ vitamin C', v: 92, c: ACCENT },
      { l: '+ tea/coffee', v: 16, c: '#ffd2b8' },
    ];
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        <motion.path d="M78 22 V128 H302" {...stroke} strokeWidth={2} {...draw} />
        {bars.map((b, i) => (
          <g key={b.l}>
            <text x="70" y={44 + i * 32} fontSize="10" fill={INK} fontWeight="700" textAnchor="end">{b.l}</text>
            <motion.rect
              x="82" y={32 + i * 32} height="16" rx="8" fill={b.c}
              initial={{ width: 0 }} animate={{ width: b.v * 2 }}
              transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
            />
            <text x={90 + b.v * 2} y={44 + i * 32} fontSize="10" fill={INK} fontWeight="700">{b.v}%</text>
          </g>
        ))}
        <text x="82" y="144" fontSize="10" fill={INK} opacity="0.5" fontWeight="600">relative absorption</text>
      </svg>
    );
  }

  if (kind === 'glucose') {
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        <motion.path d="M28 104 H292" {...stroke} strokeWidth={2.5} {...draw} />
        {[
          { x: 40, t: 'Fast', s: '8 hrs' },
          { x: 128, t: 'Bloods', s: 'baseline' },
          { x: 200, t: 'Drink', s: 'glucose' },
          { x: 276, t: 'Bloods', s: '+1–2 hrs' },
        ].map((p, i) => (
          <g key={p.t}>
            <motion.circle cx={p.x} cy="104" r="7" {...stroke} fill="#fff"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 * i, type: 'spring', stiffness: 300 }} />
            <text x={p.x} y="84" fontSize="11" fill={INK} fontWeight="800" textAnchor="middle">{p.t}</text>
            <text x={p.x} y="124" fontSize="9" fill={INK} opacity="0.55" fontWeight="600" textAnchor="middle">{p.s}</text>
          </g>
        ))}
        {/* rising curve above */}
        <motion.path d="M40 62 q60 0 88 -8 q50 -14 76 -26 q40 -18 76 4" {...stroke} stroke={SOFT} strokeDasharray="4 5" {...draw} />
        <text x="196" y="26" fontSize="10" fill={SOFT} fontWeight="700">blood sugar response</text>
      </svg>
    );
  }

  if (kind === 'latch') {
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        {/* breast profile */}
        <motion.path d="M96 30 q-46 34 -14 74 q10 12 26 12" {...stroke} {...draw} />
        <motion.path d="M82 104 q-16 -8 -14 -22" {...stroke} {...draw} />
        {/* baby head tipped back */}
        <motion.circle cx="150" cy="92" r="26" {...stroke} {...draw} />
        <motion.path d="M126 82 q10 10 24 8" {...stroke} stroke={ACCENT} {...draw} />
        <motion.path d="M126 100 q12 8 26 4" {...stroke} stroke={ACCENT} {...draw} />
        {/* chin marker */}
        <motion.circle cx="130" cy="106" r="3.5" fill={ACCENT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
        <text x="182" y="70" fontSize="10" fill={INK} opacity="0.6" fontWeight="700">nose clear</text>
        <text x="182" y="112" fontSize="10" fill={ACCENT} fontWeight="700">chin buried first</text>
        <text x="52" y="140" fontSize="10" fill={INK} opacity="0.5" fontWeight="600">wide mouth · deep latch · no pinching</text>
      </svg>
    );
  }

  if (kind === 'tummy-time') {
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        <motion.path d="M30 120 H290" {...stroke} strokeWidth={3} {...draw} />
        {/* baby on front, head lifted */}
        <motion.path d="M96 118 q40 -10 88 -2" {...stroke} {...draw} />
        <motion.circle cx="92" cy="96" r="16" {...stroke} {...draw} />
        <motion.path d="M104 106 q12 8 8 14" {...stroke} {...draw} />
        <motion.path d="M186 116 q16 -2 20 -12" {...stroke} {...draw} />
        {/* lift arrow */}
        <motion.path d="M92 68 V52" {...stroke} stroke={ACCENT} {...draw} />
        <motion.path d="M86 58 l6 -8 l6 8" {...stroke} stroke={ACCENT} {...draw} />
        <text x="106" y="56" fontSize="10" fill={ACCENT} fontWeight="700">head lifts — neck strength</text>
        <text x="40" y="142" fontSize="10" fill={INK} opacity="0.5" fontWeight="600">short sessions, several times a day</text>
      </svg>
    );
  }

  if (kind === 'cycle') {
    const R = 46, cx = 96, cy = 76;
    const pt = (deg: number, r = R) => [cx + r * Math.cos((deg - 90) * Math.PI / 180), cy + r * Math.sin((deg - 90) * Math.PI / 180)];
    const [fx, fy] = pt(160);
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        <motion.circle cx={cx} cy={cy} r={R} {...stroke} {...draw} />
        {/* fertile window arc */}
        <motion.path d={`M ${pt(120)[0]} ${pt(120)[1]} A ${R} ${R} 0 0 1 ${pt(190)[0]} ${pt(190)[1]}`}
          {...stroke} stroke={SOFT} strokeWidth={6} {...draw} />
        <motion.circle cx={fx} cy={fy} r="5" fill={SOFT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }} />
        <text x={cx} y={cy - 4} fontSize="11" fill={INK} fontWeight="800" textAnchor="middle">cycle</text>
        <text x={cx} y={cy + 12} fontSize="9" fill={INK} opacity="0.5" fontWeight="600" textAnchor="middle">~28 days</text>
        <text x="164" y="58" fontSize="11" fill={SOFT} fontWeight="800">fertile window</text>
        <text x="164" y="76" fontSize="10" fill={INK} opacity="0.6" fontWeight="600">the 5 days before</text>
        <text x="164" y="92" fontSize="10" fill={INK} opacity="0.6" fontWeight="600">ovulation, plus the day</text>
      </svg>
    );
  }

  if (kind === 'nausea') {
    // the curve every book describes: climbing to week 9, gone by the second
    // trimester for most people. Drawn as the shape rather than a claim.
    const week = (w: number) => 30 + ((w - 4) / 16) * 250;
    const marks = [4, 9, 14, 20];
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        <motion.path d="M30 118 H296" {...stroke} strokeWidth={2.5} {...draw} />
        <motion.path d="M30 118 V26" {...stroke} strokeWidth={2.5} {...draw} />
        {/* the curve */}
        <motion.path
          d="M30 112 Q64 96 92 48 Q112 18 128 44 Q152 84 196 106 Q244 118 292 116"
          {...stroke} stroke={SOFT} strokeWidth={3} {...draw}
        />
        {/* peak marker */}
        <motion.circle cx={week(9)} cy="34" r="5" fill={SOFT}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />
        <text x={week(9)} y="22" fontSize="10" fill={SOFT} fontWeight="800" textAnchor="middle">peaks ~week 9</text>
        {/* week ticks */}
        {marks.map((w) => (
          <g key={w}>
            <motion.path d={`M${week(w)} 118 v6`} {...stroke} strokeWidth={1.5} opacity={0.5} {...draw} />
            <text x={week(w)} y="136" fontSize="9" fill={INK} opacity="0.55" fontWeight="700" textAnchor="middle">
              w{w}
            </text>
          </g>
        ))}
        <text x="14" y="70" fontSize="9" fill={INK} opacity="0.5" fontWeight="700"
          transform="rotate(-90 14 70)" textAnchor="middle">how bad</text>
        <text x="250" y="100" fontSize="9.5" fill={ACCENT} fontWeight="700" textAnchor="middle">usually eases</text>
      </svg>
    );
  }

  if (kind === 'scan') {
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        {/* the probe's fan of sound */}
        <motion.path d="M44 26 L20 120 L116 120 Z" {...stroke} opacity={0.35} {...draw} />
        <motion.path d="M38 20 h14 v10 h-14 z" {...stroke} strokeWidth={2.5} {...draw} />
        {/* baby, curled */}
        <motion.circle cx="66" cy="80" r="17" {...stroke} stroke={ACCENT} {...draw} />
        <motion.path d="M66 97 q22 6 20 24" {...stroke} stroke={ACCENT} {...draw} />
        {/* the measurement itself — crown to rump */}
        <motion.path d="M50 66 L92 116" {...stroke} stroke={SOFT} strokeWidth={2.5} strokeDasharray="5 4" {...draw} />
        <motion.circle cx="50" cy="66" r="3.5" fill={SOFT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />
        <motion.circle cx="92" cy="116" r="3.5" fill={SOFT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }} />
        <text x="150" y="46" fontSize="11" fill={SOFT} fontWeight="800">crown to rump</text>
        <text x="150" y="64" fontSize="9.5" fill={INK} opacity="0.6" fontWeight="600">one length, measured</text>
        <text x="150" y="78" fontSize="9.5" fill={INK} opacity="0.6" fontWeight="600">three times and averaged</text>
        <motion.path d="M150 90 H292" {...stroke} strokeWidth={1.5} opacity={0.3} {...draw} />
        <text x="150" y="108" fontSize="11" fill={ACCENT} fontWeight="800">→ your due date</text>
        <text x="150" y="124" fontSize="9.5" fill={INK} opacity="0.6" fontWeight="600">every later date counts</text>
        <text x="150" y="136" fontSize="9.5" fill={INK} opacity="0.6" fontWeight="600">from this one</text>
      </svg>
    );
  }

  if (kind === 'movements') {
    // deliberately two different patterns, both normal — the point of the
    // article is that the change matters, not the count
    const bars = [11, 14, 9, 13, 12, 15, 10];
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return (
      <svg viewBox="0 0 320 150" className="h-full w-full">
        <motion.path d="M28 116 H188" {...stroke} strokeWidth={2.5} {...draw} />
        {bars.map((v, i) => (
          <motion.rect
            key={i}
            x={34 + i * 22}
            y={116 - v * 5}
            width="13"
            rx="3"
            height={v * 5}
            fill={i === 6 ? SOFT : '#c6d9ff'}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            style={{ transformOrigin: `${40 + i * 22}px 116px` }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
          />
        ))}
        {days.map((d, i) => (
          <text key={i} x={40.5 + i * 22} y="130" fontSize="9" fill={INK} opacity="0.5"
            fontWeight="700" textAnchor="middle">{d}</text>
        ))}
        <text x="28" y="26" fontSize="10" fill={INK} opacity="0.6" fontWeight="700">her own pattern</text>
        <motion.path d="M200 40 H298" {...stroke} strokeWidth={1.5} opacity={0.3} {...draw} />
        <text x="200" y="34" fontSize="11" fill={ACCENT} fontWeight="800">no magic number</text>
        <text x="200" y="60" fontSize="9.5" fill={INK} opacity="0.65" fontWeight="600">ten is not a target —</text>
        <text x="200" y="74" fontSize="9.5" fill={INK} opacity="0.65" fontWeight="600">some babies do more,</text>
        <text x="200" y="88" fontSize="9.5" fill={INK} opacity="0.65" fontWeight="600">some fewer, every day</text>
        <motion.circle cx="206" cy="106" r="4" fill={SOFT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }} />
        <text x="216" y="110" fontSize="10" fill={SOFT} fontWeight="800">a change is the signal</text>
        <text x="200" y="128" fontSize="9.5" fill={INK} opacity="0.65" fontWeight="600">call the same day, not tomorrow</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 150" className="h-full w-full">
      <motion.path d="M40 110 q50 -60 100 -20 q46 36 96 -32" {...stroke} stroke={ACCENT} {...draw} />
      <motion.circle cx="140" cy="90" r="6" fill={ACCENT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
      <text x="40" y="140" fontSize="10" fill={INK} opacity="0.5" fontWeight="600">what the evidence shows</text>
    </svg>
  );
}

/* ---------------- the modal ---------------- */
export function ArticleModal({ article, onClose }: { article: Article | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && article && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [article, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {article && (
        <motion.div
          className="fixed inset-0 z-[115] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.22 } }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.article
            role="dialog" aria-modal="true" aria-label={article.title}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl shadow-float"
          >
            {/* diagram panel */}
            <div className="relative h-44 flex-none overflow-hidden bg-gradient-to-br from-brand-50 via-white to-rose-50">
              <div className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(47,58,92,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(47,58,92,0.06) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }} />
              <div className="relative h-full px-5 py-3">
                <Diagram kind={article.diagram} />
              </div>
              <button onClick={onClose} aria-label="Close article"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/60 bg-white/70 text-ink-soft backdrop-blur-md transition hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-600">
                <BookOpen className="h-3.5 w-3.5" /> Reading
                <span className="inline-flex items-center gap-1 text-ink-faint">
                  <Clock className="h-3 w-3" />{article.readMins} min
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-ink">{article.title}</h2>

              {/* handwritten-feel pull quote */}
              <p className="mt-3 border-l-2 border-brand-300 pl-3 font-serif text-[17px] italic leading-relaxed text-ink-soft">
                {article.hook}
              </p>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Why it matters</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{article.why}</p>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">How to do it</h3>
              <div className="mt-2.5 space-y-2">
                {article.steps.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                    className="flex gap-3 rounded-2xl border border-white/60 bg-white/55 px-3.5 py-2.5"
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brand-500/12 text-[11px] font-extrabold text-brand-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-ink">{s.label}</div>
                      <div className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{s.detail}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {article.caution && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-500/12 px-3.5 py-3 ring-1 ring-amber-500/25">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                  <p className="text-[12px] font-semibold leading-relaxed text-amber-700">{article.caution}</p>
                </div>
              )}

              <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                General guidance, reviewed by clinicians — not a substitute for advice about your own pregnancy.
              </p>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
