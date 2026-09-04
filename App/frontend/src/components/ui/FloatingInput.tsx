import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export type Accent = 'brand' | 'peach';

export const ACCENT: Record<Accent, { focus: string; label: string; labelFocus: string }> = {
  brand: {
    focus: 'focus:border-brand-500 focus:ring-brand-500/15',
    label: 'text-brand-600',
    labelFocus: 'peer-focus:text-brand-600',
  },
  peach: {
    focus: 'focus:border-peach-500 focus:ring-peach-500/15',
    label: 'text-peach-600',
    labelFocus: 'peer-focus:text-peach-600',
  },
};

export const inputBase =
  'peer h-14 w-full rounded-2xl border border-ink/10 bg-white/70 text-[15px] font-medium text-ink outline-none transition-all focus:bg-white focus:ring-4';

interface FloatingInputProps {
  id: string;
  label: string;
  type?: string;
  icon?: ReactNode;
  autoComplete?: string;
  required?: boolean;
  accent?: Accent;
  /** so a submitted form can be read with FormData rather than by element id */
  name?: string;
  /** what the server said was wrong with this answer, shown under the field */
  error?: string;
}

/**
 * Floating-label input on a frosted surface. The label rests inside the field
 * and lifts on focus / when filled; passwords get a reveal toggle. The accent
 * (focus ring + label colour) switches between the brand and peach themes.
 *
 * An `error` turns the border red and prints the server's own sentence
 * underneath, wired to the input by aria-describedby so a screen reader hears
 * the reason and not just that something failed.
 */
export function FloatingInput({
  id,
  label,
  type = 'text',
  icon,
  autoComplete,
  required,
  accent = 'brand',
  name,
  error,
}: FloatingInputProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;
  const a = ACCENT[accent];

  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-4 top-7 -translate-y-1/2 text-ink-faint">{icon}</span>
      )}
      <input
        id={id}
        name={name ?? id}
        type={inputType}
        placeholder=" "
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          inputBase, 'pt-4', icon ? 'pl-11 pr-11' : 'px-4',
          error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : a.focus,
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute top-2.5 text-xs font-semibold transition-all duration-200',
          a.label,
          icon ? 'left-11' : 'left-4',
          'peer-placeholder-shown:top-7 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-medium peer-placeholder-shown:text-ink-muted',
          'peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold',
          a.labelFocus,
        )}
      >
        {label}
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 px-1 text-[12px] font-semibold text-rose-600">
          {error}
        </p>
      )}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-7 -translate-y-1/2 rounded-lg p-1.5 text-ink-faint transition-colors hover:text-ink-soft"
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      )}
    </div>
  );
}
