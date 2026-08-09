import { BrainCircuit, Sparkles, TrendingUp, Bell, Syringe } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MiniAreaChart } from '@/components/charts/MiniAreaChart';
import { SectionHeading } from './SectionHeading';
import { weightTrend } from '@/data/landing';

export function Showcase() {
  return (
    <section id="showcase" className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="A dashboard that calms"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="Clarity, not clutter"
          description="Every surface is designed to reduce anxiety — soft depth, generous space and only what matters, right now."
        />

