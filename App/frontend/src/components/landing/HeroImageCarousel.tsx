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

