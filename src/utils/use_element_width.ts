// 요소의 너비를 재는 훅. 쪽 미리보기를 화면에 맞는 크기로 그릴 때 쓴다.
import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * 요소에 붙일 ref와 그 요소의 지금 너비(px)를 돌려준다.
 */
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
