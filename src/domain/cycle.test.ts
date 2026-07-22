import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, type CycleSettings } from './types';
import {
  ovulationCycleDay,
  fertileWindow,
  phaseForDay,
  cycleSegments,
  getCycleStatus,
} from './cycle';

const short: CycleSettings = { avgCycleLength: 22, avgPeriodLength: 6, lutealLength: 14 };

describe('cycle model — default 28/5/14', () => {
  it('ovulation lands on day 14', () => {
    expect(ovulationCycleDay(DEFAULT_SETTINGS)).toBe(14);
  });

  it('fertile window is days 9–14, peak 14', () => {
    expect(fertileWindow(DEFAULT_SETTINGS)).toEqual({ startDay: 9, endDay: 14, peakDay: 14 });
  });

  it.each([
    [1, 'menstrual'],
    [5, 'menstrual'],
    [6, 'follicular'],
    [8, 'follicular'],
    [9, 'ovulatory'],
    [14, 'ovulatory'],
    [15, 'luteal'],
    [28, 'luteal'],
  ] as const)('day %i is %s', (day, phase) => {
    expect(phaseForDay(day, DEFAULT_SETTINGS)).toBe(phase);
  });

  it('segments tile the whole cycle with no gaps or overlaps', () => {
    const segs = cycleSegments(DEFAULT_SETTINGS);
    expect(segs[0]?.startDay).toBe(1);
    expect(segs.at(-1)?.endDay).toBe(28);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]!.startDay).toBe(segs[i - 1]!.endDay + 1);
    }
  });
});

describe('cycle model — short 22-day cycle clamps safely', () => {
  it('ovulation never overlaps bleeding', () => {
    expect(ovulationCycleDay(short)).toBeGreaterThan(short.avgPeriodLength);
  });
  it('segments still tile without overlap', () => {
    const segs = cycleSegments(short);
    expect(segs[0]?.startDay).toBe(1);
    expect(segs.at(-1)?.endDay).toBe(22);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]!.startDay).toBe(segs[i - 1]!.endDay + 1);
    }
  });
});

describe('getCycleStatus', () => {
  it('computes cycle day, phase, and countdown from the last period', () => {
    const last = new Date(2026, 6, 10); // Fri Jul 10 2026
    const today = new Date(2026, 6, 15); // Wed Jul 15 2026
    const st = getCycleStatus(last, DEFAULT_SETTINGS, today);
    expect(st.cycleDay).toBe(6);
    expect(st.phase).toBe('follicular');
    expect(st.isFertile).toBe(false);
    expect(st.daysUntilNextPeriod).toBe(23); // next start Aug 7
  });

  it('marks the fertile window and ovulation peak', () => {
    const last = new Date(2026, 6, 1);
    const peak = getCycleStatus(last, DEFAULT_SETTINGS, new Date(2026, 6, 14)); // day 14
    expect(peak.isOvulationPeak).toBe(true);
    expect(peak.isFertile).toBe(true);
    expect(peak.phase).toBe('ovulatory');
  });

  it('flags a late period without rolling into a new cycle', () => {
    const last = new Date(2026, 6, 1);
    const today = new Date(2026, 6, 31); // day 31
    const st = getCycleStatus(last, DEFAULT_SETTINGS, today);
    expect(st.cycleDay).toBe(31);
    expect(st.isLate).toBe(true);
    expect(st.lateBy).toBe(3);
    expect(st.phase).toBe('luteal');
    expect(st.daysUntilNextPeriod).toBeLessThan(0);
  });
});
