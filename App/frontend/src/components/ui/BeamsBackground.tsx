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

