/**
 * Ambient scene: a calm soft-blue gradient wash, drifting aurora blobs and a
 * masked grid. Sits behind all content, never interactive.
 */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f8ff] via-[#eef3fe] to-[#f3f6fd]" />

      {/* aurora blobs */}
      <div className="absolute -left-[10%] -top-[12%] h-[46rem] w-[46rem] rounded-full bg-brand-300/40 blur-[120px] animate-float-slow" />
      <div
        className="absolute -right-[12%] top-[6%] h-[42rem] w-[42rem] rounded-full bg-aqua-300/35 blur-[120px] animate-float-slow"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="absolute bottom-[-14%] left-[26%] h-[40rem] w-[40rem] rounded-full bg-brand-200/45 blur-[130px] animate-float-slow"
        style={{ animationDelay: '-13s' }}
      />

      {/* masked grid for structure */}
      <div className="absolute inset-0 bg-grid" />

      {/* subtle top sheen */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent" />
    </div>
  );
}
