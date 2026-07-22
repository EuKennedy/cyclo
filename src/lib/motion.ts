import { useReducedMotion } from 'framer-motion';

/**
 * True when continuous/looping motion should be suppressed: either the user
 * prefers reduced motion, or `?still` is present in the URL (used for reduced-
 * motion snapshots and visual QA). One-shot transitions still play.
 */
export function useStill(): boolean {
  const reduce = useReducedMotion();
  const still =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('still');
  return Boolean(reduce) || still;
}
