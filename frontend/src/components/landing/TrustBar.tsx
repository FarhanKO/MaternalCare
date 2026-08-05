import { Reveal } from '@/components/ui/Reveal';
import { stats } from '@/data/landing';

export function TrustBar() {
  return (
    <section className="px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-10 text-center text-sm font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Built on the science of preventive maternal care
        </Reveal>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="glass rounded-3xl px-6 py-7 text-center ring-gradient">
                <div className="text-4xl font-bold tracking-tight text-gradient">{s.value}</div>
                <p className="mx-auto mt-2 max-w-[15rem] text-sm leading-snug text-ink-soft">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
