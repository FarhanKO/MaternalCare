import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

/** Small frosted pill — used for eyebrows, tags and status chips. */
export function Badge({ children, className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-3 py-1',
        'text-xs font-semibold text-brand-700 backdrop-blur-md shadow-soft',
        className,
      )}
    >
      {icon && <span className="text-brand-500">{icon}</span>}
      {children}
    </span>
  );
}
