/** The four clinical phases surfaced by the app. The fertile window is drawn as
 * a distinct sub-band inside the ovulatory phase (see CycleStatus flags). */
export type PhaseId = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export const PHASE_ORDER: readonly PhaseId[] = [
  'menstrual',
  'follicular',
  'ovulatory',
  'luteal',
] as const;

/** Confidence tier for a prediction, driven by cycle-length variability. */
export type ConfidenceTier =
  | 'very-high'
  | 'high'
  | 'moderate'
  | 'low'
  | 'irregular'
  | 'insufficient';

export interface CycleSettings {
  /** Average total cycle length in days (menses day 1 to next menses day 1). */
  avgCycleLength: number;
  /** Average bleeding duration in days. */
  avgPeriodLength: number;
  /** Effective luteal-phase length (per-user override, else the default 14). */
  lutealLength: number;
}

export const DEFAULT_SETTINGS: CycleSettings = {
  avgCycleLength: 28,
  avgPeriodLength: 5,
  lutealLength: 14,
};

/** A colored arc of the cycle ring, in 1-indexed inclusive cycle days. */
export interface PhaseSegment {
  phase: PhaseId;
  startDay: number;
  endDay: number;
}

export interface FertileWindow {
  startDay: number;
  endDay: number;
  peakDay: number;
}

/** Everything the UI needs to render "where am I right now". */
export interface CycleStatus {
  /** 1-indexed day of the current cycle (can exceed cycleLength when late). */
  cycleDay: number;
  phase: PhaseId;
  /** True when today falls inside the estimated fertile window. */
  isFertile: boolean;
  /** True on the estimated ovulation (peak) day. */
  isOvulationPeak: boolean;
  /** True when the period is overdue relative to the average cycle length. */
  isLate: boolean;
  /** Days overdue (0 unless late). A new period may simply be unlogged. */
  lateBy: number;
  cycleLength: number;
  ovulationDay: number;
  fertileWindow: { startDay: number; endDay: number };
  /** 0..1 position around the ring. */
  progress: number;
  /** Whole days until the next predicted period start (negative if overdue). */
  daysUntilNextPeriod: number;
  nextPredictedStart: Date;
}
