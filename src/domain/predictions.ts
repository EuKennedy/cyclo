import { addDays, differenceInCalendarDays } from 'date-fns';
import { CYCLE } from './constants';
import type { ConfidenceTier } from './types';
import { clamp, mean, median, stdev } from './stats';

/**
 * The prediction engine — pure functions over a sorted list of period-start
 * dates: starts[] → cycle lengths → estimate → next start → ovulation → fertile
 * window. Every estimator is swappable without touching downstream consumers.
 *
 * Hard rule (docs/RESEARCH-SPEC.md §2.5): there is no "safe day" concept anywhere
 * in this module. Fertility output is always a probability band + confidence,
 * never a guaranteed single day, and never a contraceptive signal.
 */

/** Whole-day gaps between consecutive period starts. */
export function cycleLengthsFromStarts(starts: readonly Date[]): number[] {
  const sorted = [...starts].sort((a, b) => a.getTime() - b.getTime());
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur) continue;
    lengths.push(differenceInCalendarDays(cur, prev));
  }
  return lengths;
}

/** A gap ≈2× (or more) the typical length is likely one or more un-logged
 * periods. Split it so a single missed log does not poison the average. */
export function splitMissedLogs(lengths: readonly number[], typical: number): number[] {
  if (!(typical > 0)) return [...lengths];
  const out: number[] = [];
  for (const len of lengths) {
    if (len >= 1.75 * typical) {
      const k = Math.max(1, Math.round(len / typical));
      const piece = Math.round(len / k);
      for (let i = 0; i < k; i++) out.push(piece);
    } else {
      out.push(len);
    }
  }
  return out;
}

/** Reject biologically impossible values, then trim ~2 SD outliers. */
export function trimOutliers(lengths: readonly number[]): number[] {
  const [lo, hi] = CYCLE.BIO_HARD_CLAMP;
  const clamped = lengths.filter((x) => x >= lo && x <= hi);
  if (clamped.length < 3) return clamped;
  const m = mean(clamped);
  const s = stdev(clamped, m);
  if (s === 0) return clamped;
  return clamped.filter((x) => Math.abs(x - m) <= 2 * s);
}

/** Exponentially-weighted mean: the most recent cycle counts most. */
export function ewmaMean(cycles: readonly number[]): number {
  if (cycles.length === 0) return NaN;
  const k = cycles.length - 1;
  let num = 0;
  let den = 0;
  for (let i = 0; i < cycles.length; i++) {
    const v = cycles[i];
    if (v === undefined) continue;
    const w = CYCLE.EWMA_ALPHA ** (k - i);
    num += w * v;
    den += w;
  }
  return den === 0 ? NaN : num / den;
}

/** Blend the user's estimate with the population mean when data is thin. */
export function shrinkToPrior(userAvg: number, n: number): number {
  return (n * userAvg + CYCLE.SHRINK_K * CYCLE.POP_MEAN_CYCLE) / (n + CYCLE.SHRINK_K);
}

export interface CycleStats {
  mean: number;
  sd: number;
  range: number;
  cv: number;
  n: number;
}

export function cycleStats(lengths: readonly number[]): CycleStats {
  const n = lengths.length;
  if (n === 0) return { mean: NaN, sd: NaN, range: NaN, cv: NaN, n: 0 };
  const m = mean(lengths);
  const sd = stdev(lengths, m);
  const range = Math.max(...lengths) - Math.min(...lengths);
  return { mean: m, sd, range, cv: m ? sd / m : NaN, n };
}

export interface CycleEstimate {
  /** Estimated average cycle length in days (unrounded). */
  avg: number;
  /** Number of cycle-length samples that fed the estimate. */
  n: number;
  /** True when the population fallback was used (history too sparse). */
  usedFallback: boolean;
  stats: CycleStats;
  confidence: ConfidenceTier;
  irregular: boolean;
}

/** Personalized average cycle length with graceful sparse-data fallback. */
export function estimateCycleLength(starts: readonly Date[]): CycleEstimate {
  const raw = cycleLengthsFromStarts(starts);

  if (raw.length < CYCLE.MIN_DATA) {
    return {
      avg: CYCLE.POP_MEAN_CYCLE,
      n: raw.length,
      usedFallback: true,
      stats: cycleStats(raw),
      confidence: 'insufficient',
      irregular: false,
    };
  }

  const provisional = median(raw);
  const split = splitMissedLogs(raw, provisional);
  const recent = split.slice(-CYCLE.PREDICT_WINDOW);
  const trimmed = trimOutliers(recent);
  const base = trimmed.length ? trimmed : recent;

  const avg = shrinkToPrior(ewmaMean(base), base.length);
  const stats = cycleStats(base);

  return {
    avg,
    n: base.length,
    usedFallback: false,
    stats,
    confidence: confidenceTier(stats),
    irregular: isIrregular(stats),
  };
}

/** N future period-start dates. Each prediction anchors the next; confidence
 * widens the further out you forecast (see predictedRange). */
export function predictNextPeriods(lastStart: Date, avg: number, count: number): Date[] {
  const step = Math.round(avg);
  return Array.from({ length: count }, (_, i) => addDays(lastStart, step * (i + 1)));
}

/** Estimated ovulation date by the backward-counting (luteal) method. */
export function estimateOvulation(nextPeriodStart: Date, lutealLength: number): Date {
  return addDays(nextPeriodStart, -lutealLength);
}

export interface FertileWindowDates {
  start: Date;
  end: Date;
  peak: Date;
}

/** Wilcox 6-day fertile window as calendar dates, ending on ovulation day. */
export function fertileWindowDates(ovulation: Date): FertileWindowDates {
  return {
    start: addDays(ovulation, -CYCLE.FERTILE_LEAD),
    end: addDays(ovulation, CYCLE.FERTILE_TAIL),
    peak: ovulation,
  };
}

/** ~95% prediction interval around a predicted start (Normal approximation). */
export function predictedRange(
  predictedStart: Date,
  sd: number,
  z: number = CYCLE.Z_95,
): { earliest: Date; latest: Date } {
  const spread = Number.isFinite(sd) ? Math.round(z * sd) : 0;
  return {
    earliest: addDays(predictedStart, -spread),
    latest: addDays(predictedStart, spread),
  };
}

/** Per-user luteal length calibrated from confirmed ovulations (LH/BBT), clamped. */
export function calibrateLutealLength(
  confirmations: ReadonlyArray<{ ovulation: Date; nextPeriodStart: Date }>,
): number | null {
  const lengths = confirmations
    .map((c) => differenceInCalendarDays(c.nextPeriodStart, c.ovulation))
    .filter((d) => d >= CYCLE.LUTEAL_MIN && d <= CYCLE.LUTEAL_MAX);
  if (lengths.length === 0) return null;
  return clamp(Math.round(mean(lengths)), CYCLE.LUTEAL_MIN, CYCLE.LUTEAL_MAX);
}

export function isIrregular(stats: CycleStats): boolean {
  if (stats.n < 2) return false;
  return stats.range > 9 || stats.mean < 21 || stats.mean > 38;
}

export function confidenceTier(stats: CycleStats): ConfidenceTier {
  if (stats.n < 3) return 'insufficient';
  if (stats.range > 9 || stats.sd > 7) return 'irregular';
  if (stats.sd <= 1.5) return 'very-high';
  if (stats.sd <= 3) return 'high';
  if (stats.sd <= 5) return 'moderate';
  return 'low';
}
