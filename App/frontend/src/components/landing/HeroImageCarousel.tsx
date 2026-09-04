import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

const slides = ['/hero/slide1.jpg', '/hero/slide2.jpg', '/hero/slide3.jpg', '/hero/slide4.jpg'];

const ROTATE_MS = 9000;

/**
 * Full-panel rotating background: slowly crossfades between photos with a
 * gentle Ken Burns drift, plus legibility overlays weighted to the left
 * where the hero copy sits. Fills its positioned parent.
 */
export function HeroImageCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          style={{ willChange: 'opacity' }}
          className={cn(
            'absolute inset-0 h-full w-full animate-kenburns object-cover transition-opacity duration-[2000ms] ease-in-out',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}

      {/* legibility overlays — darker on the left, under the copy */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1226]/85 via-[#0a1226]/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1226]/70 via-transparent to-[#0a1226]/20" />
    </div>
  );
}
