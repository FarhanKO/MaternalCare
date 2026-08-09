import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

interface BeamsBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
  /** number of drifting beams */
  count?: number;
}

const OPACITY: Record<NonNullable<BeamsBackgroundProps['intensity']>, number> = {
  subtle: 0.6, medium: 0.85, strong: 1,
};

/* brand-blue → aqua band so it matches the MaternalCare+ palette */
const HUE_BASE = 205;
const HUE_RANGE = 45;

function createBeam(w: number, h: number): Beam {
  return {
    x: Math.random() * w * 1.5 - w * 0.25,
    y: Math.random() * h * 1.5 - h * 0.25,
    width: 30 + Math.random() * 60,
    length: h * 2.5,
    angle: -35 + Math.random() * 10,
    speed: 0.25 + Math.random() * 0.45,
    opacity: 0.14 + Math.random() * 0.16,
    hue: HUE_BASE + Math.random() * HUE_RANGE,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.015 + Math.random() * 0.025,
  };
}

/**
 * Drifting light beams painted on a canvas, sized to its parent element.
 * Adapted from the KokonutUI beams background, re-skinned to the brand palette
 * and scoped to a card instead of the full viewport.
 */
export function BeamsBackground({ className, intensity = 'medium', count = 14 }: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // work in CSS pixels
      beamsRef.current = Array.from({ length: count }, () => createBeam(w, h));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const resetBeam = (beam: Beam, index: number) => {
      const column = index % 3;
      const spacing = w / 3;
      beam.y = h + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 60 + Math.random() * 80;
      beam.length = h * 2.5;
      beam.speed = 0.25 + Math.random() * 0.35;
      beam.hue = HUE_BASE + (index * HUE_RANGE) / count;
      beam.opacity = 0.16 + Math.random() * 0.12;
    };

    const drawBeam = (beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const o = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * OPACITY[intensity];
      const g = ctx.createLinearGradient(0, 0, 0, beam.length);
      const sat = '78%', light = '58%';
      g.addColorStop(0, `hsla(${beam.hue}, ${sat}, ${light}, 0)`);
      g.addColorStop(0.1, `hsla(${beam.hue}, ${sat}, ${light}, ${o * 0.5})`);
      g.addColorStop(0.4, `hsla(${beam.hue}, ${sat}, ${light}, ${o})`);
      g.addColorStop(0.6, `hsla(${beam.hue}, ${sat}, ${light}, ${o})`);
      g.addColorStop(0.9, `hsla(${beam.hue}, ${sat}, ${light}, ${o * 0.5})`);
      g.addColorStop(1, `hsla(${beam.hue}, ${sat}, ${light}, 0)`);

      ctx.fillStyle = g;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.filter = 'blur(24px)';
      beamsRef.current.forEach((beam, i) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, i);
        drawBeam(beam);
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    // respect reduced-motion: paint one static frame instead of looping
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      ctx.filter = 'blur(24px)';
      beamsRef.current.forEach((b) => drawBeam(b));
    } else {
      animate();
    }

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity, count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ filter: 'blur(10px)' }}
    />
  );
}

export default BeamsBackground;
