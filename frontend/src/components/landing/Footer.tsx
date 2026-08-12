import { useLocation, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

interface FooterLink {
  label: string;
  /** in-app route, optionally with a query string */
  to?: string;
  /** landing-page section id — scrolls there, jumping home first if needed */
  hash?: string;
}

const groups: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Dashboard', to: '/mother' },
      { label: 'Health trends', to: '/mother?tab=vitals' },
      { label: 'Reminders', to: '/mother?tab=reminders' },
      { label: 'Community', to: '/mother?tab=community' },
    ],
  },
  {
    title: 'For care teams',
    links: [
      { label: 'Doctor portal', to: '/doctor' },
      { label: 'Patients', to: '/doctor?tab=patients' },
      { label: 'Schedule', to: '/doctor?tab=schedule' },
      { label: 'Reports', to: '/doctor?tab=reports' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our story', to: '/about' },
      { label: 'Features', hash: 'features' },
      { label: 'How it works', hash: 'journey' },
      { label: 'Get started', to: '/register' },
    ],
  },
];

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  /** Routes navigate; hashes scroll — returning home first when elsewhere. */
  const go = (l: FooterLink) => {
    if (l.to) {
      navigate(l.to);
      window.scrollTo({ top: 0 });
      return;
    }
    if (!l.hash) return;
    const scroll = () => document.getElementById(l.hash!)?.scrollIntoView({ behavior: 'smooth' });
    if (location.pathname === '/') scroll();
    else {
      navigate('/');
      setTimeout(scroll, 180);
    }
  };

  const goHome = () => {
    if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
    else { navigate('/'); window.scrollTo({ top: 0 }); }
  };

  return (
    <footer className="px-4 pb-10 pt-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass rounded-4xl px-8 py-12 ring-gradient">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <button onClick={goHome} className="flex items-center gap-2.5" aria-label="MaternalCare+ home">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
                  <Activity className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
                </span>
                <span className="text-[17px] font-bold tracking-tight text-ink">
                  Maternal<span className="text-gradient">Care+</span>
                </span>
              </button>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
                A calmer, more connected way to care for mothers and children — from pregnancy to early childhood.
              </p>
            </div>

            {groups.map((g) => (
              <div key={g.title}>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{g.title}</div>
                <ul className="mt-4 space-y-2.5">
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => go(l)}
                        className="text-left text-sm font-medium text-ink-soft transition-colors hover:text-brand-600"
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/50 pt-6 text-sm text-ink-faint sm:flex-row">
            <span>© {new Date().getFullYear()} MaternalCare+. Crafted with care.</span>
            <span className="font-medium">Private by design · Clinician-reviewed</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
