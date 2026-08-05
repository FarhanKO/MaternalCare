import { motion } from 'framer-motion';
import { useState, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'peach' | 'glass' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface LiquidButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  icon?: ReactNode;
  iconRight?: ReactNode;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_10px_30px_-8px_rgba(63,102,240,0.55)] hover:shadow-[0_16px_40px_-8px_rgba(63,102,240,0.7)]',
  peach:
    'text-white bg-gradient-to-br from-peach-400 to-peach-600 shadow-[0_10px_30px_-8px_rgba(234,92,29,0.5)] hover:shadow-[0_16px_40px_-8px_rgba(234,92,29,0.65)]',
  glass:
    'text-ink glass-strong hover:bg-white/90',
  ghost:
    'text-ink-soft hover:text-ink hover:bg-white/60',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-[52px] px-7 text-[15px] gap-2.5 rounded-2xl',
};

/**
 * Premium button with a spring press, hover elevation and a material ripple
 * that originates from the click point.
 */
export function LiquidButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  type = 'button',
  icon,
  iconRight,
}: LiquidButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650);
    onClick?.(e);
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'relative inline-flex select-none items-center justify-center overflow-hidden font-semibold',
        'transition-colors duration-300',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {icon && <span className="relative z-10 -ml-0.5 inline-flex">{icon}</span>}
      <span className="relative z-10">{children}</span>
      {iconRight && <span className="relative z-10 -mr-0.5 inline-flex">{iconRight}</span>}

      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute z-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-[ripple_0.65s_ease-out] rounded-full bg-white/40"
          style={{ left: r.x, top: r.y }}
        />
      ))}

      <style>{`@keyframes ripple{from{transform:translate(-50%,-50%) scale(1);opacity:.5}to{transform:translate(-50%,-50%) scale(46);opacity:0}}`}</style>
    </motion.button>
  );
}
