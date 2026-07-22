/**
 * Small, dependency-free statistics helpers used by the prediction engine.
 * All functions are pure and total (they never throw); empty input yields NaN
 * for aggregates so callers can decide on fallbacks explicitly.
 */

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const a = s[mid];
  if (a === undefined) return NaN;
  if (s.length % 2 === 1) return a;
  const b = s[mid - 1];
  return b === undefined ? a : (a + b) / 2;
}

/** Sample standard deviation (n-1). Returns 0 for fewer than two values. */
export function stdev(xs: readonly number[], mu: number = mean(xs)): number {
  if (xs.length < 2) return 0;
  let acc = 0;
  for (const x of xs) acc += (x - mu) ** 2;
  return Math.sqrt(acc / (xs.length - 1));
}

/** Median absolute deviation — robust to a single distorting outlier month. */
export function mad(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}
