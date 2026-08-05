# MaternalCare+ — Frontend

A premium, calm maternal & child health experience. Soft-blue liquid-glass design,
Framer Motion throughout, interactive Recharts, and minimal Lucide line icons.

## Stack

- **React 18 + TypeScript**
- **Vite** dev/build tooling
- **Tailwind CSS** (custom design-system tokens)
- **Framer Motion** — spring animations, scroll reveals, blur/opacity/scale transitions
- **Recharts** — animated area charts
- **Lucide** — minimal line icons (no emoji)

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

> Animations are driven by `requestAnimationFrame`, so they only play in a
> visible browser tab. Open the page in a real browser window to see the motion.

## Structure

```
frontend/
  tailwind.config.js        design tokens (colors, radii, shadows, keyframes)
  src/
    index.css               glass utilities, gradients, skeleton shimmer
    lib/
      cn.ts                 class-merge helper
      motion.ts             shared Framer variants & springs
    components/
      ui/                   design-system primitives
        GlassCard.tsx  LiquidButton.tsx  ProgressRing.tsx
        Reveal.tsx     Badge.tsx
      charts/
        MiniAreaChart.tsx   Recharts area chart + glass tooltip
      landing/              landing-page sections
        Background  Navbar  Hero  HeroPreview  TrustBar
        Features  Showcase  Journey  CTASection  Footer  SectionHeading
    data/landing.ts         copy & chart data
    App.tsx                 page composition + scroll progress
```

## Roadmap (design-system reused throughout)

1. Landing Page ✅
2. Dashboard 3. Authentication 4. Pregnancy Tracking 5. AI Prediction
6. Doctor Portal 7. Child Monitoring 8. Community 9. Settings

Backend: **ASP.NET Core** (Clean Architecture · Repository · Service layer · DI) — planned.
