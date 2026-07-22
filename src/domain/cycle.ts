import { addDays, differenceInCalendarDays } from 'date-fns';
import { CYCLE } from './constants';
import type { CycleSettings, CycleStatus, FertileWindow, PhaseId, PhaseSegment } from './types';

/**
 * The cycle model. Pure, deterministic, and computed per-user — never on a fixed
 * 28-day template. All day math is whole-day / calendar-day based to avoid DST
 * and timezone drift (see docs/RESEARCH-SPEC.md §1.2).
 */

/** Estimated ovulation as a 1-indexed cycle day. Clamped so it never overlaps
 * bleeding in very short cycles. */
export function ovulationCycleDay(s: CycleSettings): number {
  return Math.max(s.avgCycleLength - s.lutealLength, s.avgPeriodLength + 1);
}

/** The fertile window in 1-indexed cycle days (Wilcox 6-day, ending on ovulation). */
export function fertileWindow(s: CycleSettings): FertileWindow {
  const peakDay = ovulationCycleDay(s);
  const startDay = Math.max(peakDay - CYCLE.FERTILE_LEAD, s.avgPeriodLength + 1);
  const endDay = peakDay + CYCLE.FERTILE_TAIL;
  return { startDay, endDay, peakDay };
}

/** The clinical phase for a given 1-indexed cycle day. */
export function phaseForDay(day: number, s: CycleSettings): PhaseId {
  const clamped = Math.min(Math.max(day, 1), s.avgCycleLength);
  const { startDay: fertLo, endDay: fertHi } = fertileWindow(s);
  if (clamped <= s.avgPeriodLength) return 'menstrual';
  if (clamped < fertLo) return 'follicular';
  if (clamped <= fertHi) return 'ovulatory';
  return 'luteal';
}

/** Ordered, non-overlapping colored arcs covering the whole cycle for the ring. */
export function cycleSegments(s: CycleSettings): PhaseSegment[] {
  const C = s.avgCycleLength;
  const L = Math.min(s.avgPeriodLength, C);
  const ov = ovulationCycleDay(s);
  const { startDay: fertLo } = fertileWindow(s);
  const segs: PhaseSegment[] = [{ phase: 'menstrual', startDay: 1, endDay: L }];

  const follicularStart = L + 1;
  const follicularEnd = fertLo - 1;
  if (follicularEnd >= follicularStart) {
    segs.push({ phase: 'follicular', startDay: follicularStart, endDay: follicularEnd });
  }

  segs.push({ phase: 'ovulatory', startDay: fertLo, endDay: Math.min(ov, C) });

  if (ov + 1 <= C) {
    segs.push({ phase: 'luteal', startDay: ov + 1, endDay: C });
  }
  return segs;
}

/** How many days before the period PMS symptoms typically show up. */
export const PMS_WINDOW_DAYS = 5;

/** True on the premenstrual (TPM) stretch at the tail of the luteal phase. */
export function isPmsDay(day: number, s: CycleSettings): boolean {
  const start = s.avgCycleLength - PMS_WINDOW_DAYS + 1;
  return day >= start && day <= s.avgCycleLength && phaseForDay(day, s) === 'luteal';
}

/** 1-indexed cycle day for a date, given the last period's start (day 1 = first
 * day of bleeding). Values < 1 indicate a start date in the future. */
export function currentCycleDay(lastPeriodStart: Date, today: Date = new Date()): number {
  return differenceInCalendarDays(today, lastPeriodStart) + 1;
}

/** Complete "where am I right now" snapshot for the home ring. */
export function getCycleStatus(
  lastPeriodStart: Date,
  s: CycleSettings,
  today: Date = new Date(),
): CycleStatus {
  const C = s.avgCycleLength;
  const rawDay = currentCycleDay(lastPeriodStart, today);
  const cycleDay = Math.max(rawDay, 1);

  const isLate = cycleDay > C;
  const lateBy = isLate ? cycleDay - C : 0;

  const phase = phaseForDay(cycleDay, s);
  const ov = ovulationCycleDay(s);
  const fw = fertileWindow(s);
  const dayForFlags = Math.min(cycleDay, C);

  const nextPredictedStart = addDays(lastPeriodStart, C);

  return {
    cycleDay,
    phase,
    isFertile: dayForFlags >= fw.startDay && dayForFlags <= fw.endDay,
    isOvulationPeak: dayForFlags === ov,
    isLate,
    lateBy,
    cycleLength: C,
    ovulationDay: ov,
    fertileWindow: { startDay: fw.startDay, endDay: fw.endDay },
    progress: Math.min(cycleDay / C, 1),
    daysUntilNextPeriod: differenceInCalendarDays(nextPredictedStart, today),
    nextPredictedStart,
  };
}
