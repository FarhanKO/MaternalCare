import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Baby,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  Calendar,
  HeartPulse,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { FloatingInput, type Accent } from '@/components/ui/FloatingInput';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { GlassDatePicker } from '@/components/ui/GlassDatePicker';
import { cn } from '@/lib/cn';
import { spring, fadeUp } from '@/lib/motion';
import { api, FieldError } from '@/lib/api';

type Role = 'mother' | 'doctor';

const ROLE_ACCENT: Record<Role, Accent> = { mother: 'brand', doctor: 'peach' };

const THEME: Record<
  Role,
  { grad: string; overlay: string; img: string; chip: string; quote: string; icon: ReactNode }
> = {
  mother: {
    grad: 'from-brand-500 to-brand-700',
    overlay: 'from-brand-700/80 via-brand-800/70 to-[#0a1226]/88',
    img: '/hero/slide1.jpg',
    chip: 'Personalised maternal & child care',
    quote: 'Every mother deserves the best care, and every child the best start.',
    icon: <HeartPulse className="h-5 w-5" />,
  },
  doctor: {
    grad: 'from-peach-400 to-peach-600',
    overlay: 'from-peach-500/85 via-peach-600/75 to-[#2a1206]/90',
    img: '/hero/doctor.jpg',
    chip: 'Built for clinicians & care teams',
    quote: 'The best care happens when the right data is one tap away.',
    icon: <Stethoscope className="h-5 w-5" />,
  },
};

export function Register() {
  const [role, setRole] = useState<Role>('mother');
  const [stage, setStage] = useState('');
  const [due, setDue] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docExp, setDocExp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** whichever answer the server refused, and why */
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);

  const navigate = useNavigate();
  const accent = ROLE_ACCENT[role];
  const theme = THEME[role];
  const isPregnant = stage.toLowerCase().includes('pregnant');

  // Measure the form's natural height so the box can animate its size between
  // roles (Doctor has more fields) — kept live via ResizeObserver so it stays
  // correct on role change, the conditional due-date field, and window resize.
  const innerRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState<number | 'auto'>('auto');

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setBoxHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Years of practice arrives as a band, because nobody wants to be asked for
   * a number they have to work out. The ranking wants a number, so the band
   * resolves to its floor — the claim we can actually stand behind.
   */
  const yearsFrom = (band: string) => {
    const first = band.match(/\d+/);
    return first ? Number(first[0]) : 0;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError(null);

    // Mothers still go straight to onboarding: there is no account system for
    // them yet, and the questionnaire is what the rest of the app reads.
    if (role === 'mother') {
      setSubmitting(true);
      navigate(`/onboarding?stage=${encodeURIComponent(stage || 'Pregnant')}`);
      return;
    }

    // A clinician's registration is real — it writes the row every patient's
    // list is built from, which is the only way into that list.
    const form = new FormData(e.currentTarget);
    const value = (k: string) => String(form.get(k) ?? '').trim();

    setSubmitting(true);
    try {
      await api.registerDoctor({
        name: value('d-name'),
        specialty: docSpecialty,
        qualification: value('d-qualification'),
        years: yearsFrom(docExp),
        email: value('d-email'),
        phone: value('d-phone'),
        licenseNo: value('d-license'),
      });
      navigate('/signin?registered=1');
    } catch (err) {
      setFieldError({
        field: err instanceof FieldError ? err.field : undefined,
        message: err instanceof Error ? err.message : 'Could not complete your registration',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={spring}
        className="glass-strong ring-gradient grid w-full max-w-5xl overflow-hidden rounded-[2rem] shadow-glass-lg md:grid-cols-2"
      >
        {/* brand / visual panel — themed by role, crossfading */}
        <div className="relative hidden overflow-hidden md:block">
          {(['mother', 'doctor'] as Role[]).map((r) => (
            <div
              key={r}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-in-out',
                role === r ? 'opacity-100' : 'opacity-0',
              )}
            >
              <img src={THEME[r].img} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className={cn('absolute inset-0 bg-gradient-to-br', THEME[r].overlay)} />
            </div>
          ))}

          <div className="relative flex h-full flex-col justify-between p-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur-md">
                <Activity className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
              </span>
              <span className="text-[17px] font-bold tracking-tight text-white">MaternalCare+</span>
            </Link>

            <motion.div
              key={role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white/95 backdrop-blur-md">
                {theme.icon} {theme.chip}
              </span>
              <p className="mt-5 max-w-sm font-serif text-3xl font-medium italic leading-snug text-white">
                “{theme.quote}”
              </p>
              <div className="mt-8 flex items-center gap-3 text-white/85">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="text-sm">
                  <div className="font-semibold text-white">Private &amp; secure by design</div>
                  <div className="text-white/70">
                    {role === 'doctor' ? 'Your qualifications go on your public profile.' : 'Your health data stays encrypted and yours.'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* form panel */}
        <div className="px-7 py-10 sm:px-12 sm:py-12">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Create your{' '}
            <span className={cn('font-serif text-[1.1em] font-medium italic', role === 'doctor' ? 'text-peach-600' : 'text-brand-600')}>
              account
            </span>
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">Tell us who you are so we can tailor your care experience.</p>

          {/* role switch */}
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-ink/[0.06] p-1.5">
            {(['mother', 'doctor'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors',
                  role === r ? 'text-white' : 'text-ink-soft hover:text-ink',
                )}
              >
                {role === r && (
                  <motion.span
                    layoutId="roleHighlight"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className={cn('absolute inset-0 rounded-xl bg-gradient-to-br shadow-soft', THEME[r].grad)}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {r === 'mother' ? <HeartPulse className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                  {r === 'mother' ? 'Mother' : 'Doctor'}
                </span>
              </button>
            ))}
          </div>

          {/* role-specific form — the box animates its size between roles */}
          <motion.div
            animate={{ height: boxHeight }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 overflow-hidden"
          >
            <div ref={innerRef}>
              <motion.form
                key={role}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                onSubmit={onSubmit}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
              {role === 'mother' ? (
                <>
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <FloatingInput id="m-name" label="Full name" icon={<User className="h-[18px] w-[18px]" />} accent={accent} required />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingInput id="m-email" label="Email address" type="email" autoComplete="email" icon={<Mail className="h-[18px] w-[18px]" />} accent={accent} required />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingInput id="m-phone" label="Phone number" type="tel" icon={<Phone className="h-[18px] w-[18px]" />} accent={accent} />
                  </motion.div>
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <FloatingInput id="m-password" label="Password" type="password" autoComplete="new-password" icon={<Lock className="h-[18px] w-[18px]" />} accent={accent} required />
                  </motion.div>
                  <motion.div variants={fadeUp} className={isPregnant ? '' : 'sm:col-span-2'}>
                    <GlassSelect
                      label="I am currently"
                      icon={<HeartPulse className="h-[18px] w-[18px]" />}
                      accent={accent}
                      value={stage}
                      onChange={setStage}
                      options={['Pregnant', 'A new mother (0–12 months)', 'Parent of a young child', 'Planning a pregnancy']}
                    />
                  </motion.div>
                  {isPregnant && (
                    <motion.div variants={fadeUp}>
                      <GlassDatePicker label="Expected due date" icon={<Calendar className="h-[18px] w-[18px]" />} accent={accent} value={due} onChange={setDue} />
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <FloatingInput id="d-name" label="Full name (Dr.)" icon={<User className="h-[18px] w-[18px]" />} accent={accent} required
                      error={fieldError?.field === 'name' ? fieldError.message : undefined} />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingInput id="d-email" label="Work email" type="email" autoComplete="email" icon={<Mail className="h-[18px] w-[18px]" />} accent={accent} required
                      error={fieldError?.field === 'email' ? fieldError.message : undefined} />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingInput id="d-phone" label="Phone number" type="tel" icon={<Phone className="h-[18px] w-[18px]" />} accent={accent} required
                      error={fieldError?.field === 'phone' ? fieldError.message : undefined} />
                  </motion.div>
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <FloatingInput id="d-password" label="Password" type="password" autoComplete="new-password" icon={<Lock className="h-[18px] w-[18px]" />} accent={accent} required />
                  </motion.div>
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <GlassSelect
                      label="Specialty"
                      icon={<Stethoscope className="h-[18px] w-[18px]" />}
                      accent={accent}
                      value={docSpecialty}
                      onChange={setDocSpecialty}
                      // worded as the existing roster words them, so a
                      // registration reads alongside the clinicians already
                      // listed rather than as a near-duplicate of one
                      options={[
                        'Obstetrics & Gynaecology',
                        'Obstetrics & Maternal Medicine',
                        'Maternal-Fetal Medicine',
                        'Paediatrics',
                        'Perinatal Mental Health',
                        'Nutrition & Dietetics',
                        'General Practice',
                      ]}
                    />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingInput id="d-license" label="Medical licence no. (BM&DC)" icon={<BadgeCheck className="h-[18px] w-[18px]" />} accent={accent} required
                      error={fieldError?.field === 'licenseNo' ? fieldError.message : undefined} />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <GlassSelect
                      label="Years of experience"
                      icon={<Briefcase className="h-[18px] w-[18px]" />}
                      accent={accent}
                      value={docExp}
                      onChange={setDocExp}
                      options={['0–2 years', '3–5 years', '6–10 years', '10+ years']}
                    />
                  </motion.div>
                  {/*
                    This slot used to ask for a hospital. It asks for
                    qualifications instead, and that is not a cosmetic swap:
                    what you are trained in is worth more than half the score
                    that decides where you appear on a mother's list, and it
                    is the one thing only you can tell us. Free text on
                    purpose — you write what is on your certificate, not what
                    fits our dropdown.
                  */}
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <FloatingInput id="d-qualification" label="Qualifications, as on your certificate" icon={<GraduationCap className="h-[18px] w-[18px]" />} accent={accent} required
                      error={fieldError?.field === 'qualification' ? fieldError.message : undefined} />
                  </motion.div>
                  <motion.div variants={fadeUp} className="sm:col-span-2">
                    <div className="flex items-start gap-2.5 rounded-2xl border border-peach-200 bg-peach-50 px-4 py-3 text-[13px] text-peach-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
                      <span>
                        Your name, specialty, qualifications and licence number go on your
                        public profile, and mothers are shown them when choosing. Nobody
                        is checking them against a register yet — so put down what you can
                        stand behind.
                      </span>
                    </div>
                  </motion.div>
                  {/* an error the server did not pin on one field still has to land somewhere */}
                  {fieldError && !fieldError.field && (
                    <motion.div variants={fadeUp} className="sm:col-span-2">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">
                        {fieldError.message}
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {/* terms + submit (shared) */}
              <motion.label variants={fadeUp} className="sm:col-span-2 flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  required
                  className={cn('mt-0.5 h-4 w-4 rounded border-ink/20', role === 'doctor' ? 'accent-peach-600' : 'accent-brand-600')}
                />
                <span>
                  I agree to the <a href="#" className="font-semibold text-ink hover:underline">Terms</a> and{' '}
                  <a href="#" className="font-semibold text-ink hover:underline">Privacy Policy</a>.
                </span>
              </motion.label>

              <motion.div variants={fadeUp} className="sm:col-span-2">
                <LiquidButton
                  type="submit"
                  size="lg"
                  variant={role === 'doctor' ? 'peach' : 'primary'}
                  className="w-full"
                  iconRight={<ArrowRight className="h-[18px] w-[18px]" />}
                >
                  {submitting ? 'Creating account…' : role === 'doctor' ? 'Create clinician account' : 'Create account'}
                </LiquidButton>
              </motion.div>
              </motion.form>
            </div>
          </motion.div>

          <p className="mt-7 text-center text-sm text-ink-soft">
            Already have an account?{' '}
            <Link to="/signin" className={cn('font-semibold hover:underline', role === 'doctor' ? 'text-peach-600' : 'text-brand-600')}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
