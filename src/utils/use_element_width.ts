// Hook that tracks an element's width, used to size page previews to the screen.
import { useEffect, useRef, useState, type RefObject } from 'react';

/** Returns a ref to attach and the element's current width (px). */
export function useElementWidth<T extends HTMLElement>(initial_width: number): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, set_width] = useState(initial_width);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => set_width(element.clientWidth || initial_width);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [initial_width]);

  return [ref, width];
}
