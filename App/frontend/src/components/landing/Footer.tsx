import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const groups = [
  { title: 'Platform', links: ['Dashboard', 'Pregnancy', 'Child growth', 'AI insight'] },
  { title: 'For care teams', links: ['Doctor portal', 'Caregivers', 'Reports', 'Security'] },
  { title: 'Company', links: ['About', 'Careers', 'Privacy', 'Contact'] },
];

const ROUTES: Record<string, string> = { About: '/about' };

export function Footer() {
  return (
    <footer className="px-4 pb-10 pt-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass rounded-4xl px-8 py-12 ring-gradient">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
                  <Activity className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
                </span>
                <span className="text-[17px] font-bold tracking-tight text-ink">
                  Maternal<span className="text-gradient">Care+</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
                A calmer, more connected way to care for mothers and children — from pregnancy to early childhood.
              </p>
            </div>

