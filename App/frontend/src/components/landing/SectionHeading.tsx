import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { Badge } from '@/components/ui/Badge';

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  align?: 'center' | 'left';
}

export function SectionHeading({ eyebrow, title, description, icon, align = 'center' }: SectionHeadingProps) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <Reveal className={align === 'center' ? 'flex justify-center' : ''}>
          <Badge icon={icon}>{eyebrow}</Badge>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-[2.75rem]">{title}</h2>
      </Reveal>
      {description && (
        <Reveal delay={0.1}>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{description}</p>
        </Reveal>
      )}
    </div>
  );
}
