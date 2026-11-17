// Hook that tracks an element's inner size, used to fit page previews into the space left on screen.
import { useEffect, useRef, useState, type RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/** Returns a ref to attach and the element's current inner size (px); `initial` is used until it is measured. */
export function useElementSize<T extends HTMLElement>(initial: ElementSize): [RefObject<T | null>, ElementSize] {
  const ref = useRef<T | null>(null);
  const [size, set_size] = useState(initial);
  const { width: initial_width, height: initial_height } = initial;

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const width = element.clientWidth || initial_width;
      const height = element.clientHeight || initial_height;
      set_size((now) => (now.width === width && now.height === height ? now : { width, height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [initial_width, initial_height]);

  return [ref, size];
}
