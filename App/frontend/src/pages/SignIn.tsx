import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, ArrowLeft, ArrowRight, Check, Mail, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { spring, fadeUp, staggerContainer } from '@/lib/motion';
import { useAuth } from '@/lib/auth';

export function SignIn() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  // a clinician arrives here straight from a registration that really did
  // write their row; landing them on a blank form with no acknowledgement
  // reads as though it failed
  const [params] = useSearchParams();
  const justRegistered = params.get('registered') === '1';

  /** Already signed in and arriving here — send her where she was going. */
  useEffect(() => {
    if (user) navigate(user.role === 'mother' ? '/mother' : '/doctor', { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    try {
      const signed = await signIn(
        String(form.get('email') || ''),
        String(form.get('password') || ''),
      );
      /*
       * Back to whatever she was trying to open, if the guard sent her here.
       * Otherwise the portal her role belongs to — a clinician landing on the
       * mother's dashboard would only bounce off its guard.
       */
      const back = location.state?.from;
      navigate(back || (signed.role === 'mother' ? '/mother' : '/doctor'), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work — try again');
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
        {/* brand / visual panel */}
        <div className="relative hidden overflow-hidden md:block">
          <img src="/hero/slide1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700/80 via-brand-800/70 to-[#0a1226]/85" />
          <div className="relative flex h-full flex-col justify-between p-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur-md">
                <Activity className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
              </span>
              <span className="text-[17px] font-bold tracking-tight text-white">MaternalCare+</span>
            </Link>

            <div>
              <p className="max-w-sm font-serif text-3xl font-medium italic leading-snug text-white">
                “For the healthiest mother, and the brightest future for every child.”
              </p>
              <div className="mt-8 flex items-center gap-3 text-white/85">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="text-sm">
                  <div className="font-semibold text-white">Private &amp; secure by design</div>
                  <div className="text-white/70">Your health data stays encrypted and yours.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* form panel */}
        <div className="px-7 py-10 sm:px-12 sm:py-14">
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 md:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
                <Activity className="h-4 w-4 text-white" strokeWidth={2.4} />
              </span>
            </Link>
          </div>

          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-3xl font-extrabold tracking-tight text-ink">
              Welcome{' '}
              <span className="font-serif text-[1.1em] font-medium italic text-brand-600">back</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-2 text-[15px] text-ink-soft">
              Sign in to continue your care journey.
            </motion.p>

            {justRegistered && (
              <motion.div
                variants={fadeUp}
                className="mt-6 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800"
              >
                <Check className="mt-0.5 h-4 w-4 flex-none" strokeWidth={3} />
                <span>
                  You are registered, and you are already listed — mothers can see you
                  and send you requests from now on.
                </span>
              </motion.div>
            )}

            <motion.form variants={fadeUp} onSubmit={onSubmit} className="mt-8 space-y-4">
              <FloatingInput
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                required
                icon={<Mail className="h-[18px] w-[18px]" />}
              />
              <FloatingInput
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                icon={<Lock className="h-[18px] w-[18px]" />}
              />

              {error && (
                <div className="flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 ring-1 ring-rose-500/25">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
                  <span className="text-[12.5px] font-semibold text-ink-soft">{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink/20 text-brand-600 accent-brand-600"
                  />
                  Remember me
                </label>
                <a href="#" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Forgot password?
                </a>
              </div>

              <LiquidButton
                type="submit"
                size="lg"
                className="mt-2 w-full"
                iconRight={<ArrowRight className="h-[18px] w-[18px]" />}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </LiquidButton>
            </motion.form>

            <motion.div variants={fadeUp} className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink/10" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">or</span>
              <span className="h-px flex-1 bg-ink/10" />
            </motion.div>

            <motion.div variants={fadeUp}>
              <LiquidButton variant="glass" size="lg" className="w-full" icon={<KeyRound className="h-[18px] w-[18px]" />}>
                Continue with single sign-on
              </LiquidButton>
            </motion.div>

            <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-ink-soft">
              New to MaternalCare+?{' '}
              <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Create an account
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
