import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

interface NavLink {
  label: string;
  href: string;
  route?: boolean;
}

const links: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#journey' },
  { label: 'Our story', href: '/about', route: true },
  { label: 'For clinicians', href: '#cta' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const location = useLocation();

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  const activeIndex = links.findIndex((l) => l.route && l.href === location.pathname);
  const showIndex = hovered ?? (activeIndex >= 0 ? activeIndex : null);

  // Links work from any page: hash links jump home (if needed) and smooth-scroll.
  const go = (l: NavLink) => {
    setOpen(false);
    if (l.route) {
      navigate(l.href);
      window.scrollTo({ top: 0 });
      return;
    }
    if (location.pathname === '/') {
      document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }), 160);
    }
  };

  const goHome = () => {
    if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
    else navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring, delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className={cn(
          'flex w-full max-w-6xl items-center gap-6 rounded-2xl px-4 py-2.5 transition-all duration-500',
          scrolled
            ? 'glass-strong shadow-float'
            : 'border border-white/40 bg-white/45 shadow-soft backdrop-blur-md',
        )}
      >
        {/* brand */}
        <button onClick={goHome} className="flex items-center gap-2.5 pl-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
            <Activity className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">
            Maternal<span className="text-gradient">Care+</span>
          </span>
        </button>

        {/* desktop links — sliding pill indicator follows hover / active */}
        <div className="relative ml-auto hidden items-center gap-1 md:flex" onMouseLeave={() => setHovered(null)}>
          {links.map((l, i) => (
            <button
              key={l.href}
              onMouseEnter={() => setHovered(i)}
              onClick={() => go(l)}
              className={cn(
                'relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                showIndex === i ? 'text-ink' : 'text-ink-soft hover:text-ink',
              )}
            >
              {showIndex === i && (
                <motion.span
                  layoutId="navPill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-white/75 shadow-soft ring-1 ring-white/60"
                />
              )}
              <span className="relative z-10">{l.label}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:ml-2 md:flex">
          <LiquidButton variant="ghost" size="sm" onClick={() => navigate('/signin')}>
            Sign in
          </LiquidButton>
          <LiquidButton size="sm" onClick={() => navigate('/register')}>
            Get started
          </LiquidButton>
        </div>

        {/* mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl glass-strong text-ink md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-4 top-[76px] rounded-3xl glass-strong p-4 shadow-glass md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <button
                  key={l.href}
                  onClick={() => go(l)}
                  className={cn(
                    'rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                    l.route && l.href === location.pathname
                      ? 'bg-white/70 text-ink'
                      : 'text-ink-soft hover:bg-white/70 hover:text-ink',
                  )}
                >
                  {l.label}
                </button>
              ))}
              <div className="mt-2 flex gap-2">
                <LiquidButton variant="glass" size="sm" className="flex-1" onClick={() => { setOpen(false); navigate('/signin'); }}>
                  Sign in
                </LiquidButton>
                <LiquidButton size="sm" className="flex-1" onClick={() => { setOpen(false); navigate('/register'); }}>
                  Get started
                </LiquidButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
