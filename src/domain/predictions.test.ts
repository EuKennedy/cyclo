import { describe, it, expect } from 'vitest';
import {
  cycleLengthsFromStarts,
  estimateCycleLength,
  predictNextPeriods,
  estimateOvulation,
  fertileWindowDates,
  predictedRange,
  splitMissedLogs,
  calibrateLutealLength,
  confidenceTier,
  cycleStats,
} from './predictions';

const d = (iso: string) => new Date(`${iso}T00:00:00`);

// Seven monthly starts, all exactly 28 days apart → six regular cycle lengths.
const regular28 = [
  '2026-01-01',
  '2026-01-29',
  '2026-02-26',
  '2026-03-26',
  '2026-04-23',
  '2026-05-21',
  '2026-06-18',
].map(d);

describe('cycle-length extraction', () => {
  it('measures whole-day gaps between consecutive starts', () => {
    expect(cycleLengthsFromStarts([d('2026-01-01'), d('2026-01-29')])).toEqual([28]);
  });
  it('is order-independent', () => {
    expect(cycleLengthsFromStarts([d('2026-01-29'), d('2026-01-01')])).toEqual([28]);
  });
});

describe('missed-log handling', () => {
  it('splits a doubled gap into two typical cycles', () => {
    expect(splitMissedLogs([28, 56, 28], 28)).toEqual([28, 28, 28, 28]);
  });
  it('leaves normal gaps untouched', () => {
    expect(splitMissedLogs([27, 29, 30], 28)).toEqual([27, 29, 30]);
  });
});

describe('estimateCycleLength', () => {
  it('falls back to the population mean when history is too sparse', () => {
    const est = estimateCycleLength([d('2026-01-01')]);
    expect(est.usedFallback).toBe(true);
    expect(est.avg).toBe(29);
    expect(est.confidence).toBe('insufficient');
  });

  it('personalizes to ~28 for regular cycles and reads as very-high confidence', () => {
    const est = estimateCycleLength(regular28);
    expect(Math.round(est.avg)).toBe(28);
    expect(est.usedFallback).toBe(false);
    expect(est.irregular).toBe(false);
    expect(est.confidence).toBe('very-high');
  });
});

describe('forecasts', () => {
  it('predicts sequential next period starts', () => {
    const next = predictNextPeriods(d('2026-01-01'), 28, 2);
    expect(next[0]).toEqual(d('2026-01-29'));
    expect(next[1]).toEqual(d('2026-02-26'));
  });

  it('estimates ovulation one luteal length before the next period', () => {
    expect(estimateOvulation(d('2026-01-29'), 14)).toEqual(d('2026-01-15'));
  });

  it('builds a 6-day fertile window ending on ovulation day', () => {
    const fw = fertileWindowDates(d('2026-01-15'));
    expect(fw.start).toEqual(d('2026-01-10'));
    expect(fw.end).toEqual(d('2026-01-15'));
    expect(fw.peak).toEqual(d('2026-01-15'));
  });

  it('widens the prediction interval with variability', () => {
    const { earliest, latest } = predictedRange(d('2026-02-01'), 3);
    expect(earliest).toEqual(d('2026-01-26')); // -6 days (round 1.96*3)
    expect(latest).toEqual(d('2026-02-07'));
  });
});

describe('luteal calibration', () => {
  it('averages confirmed ovulations within the clamp', () => {
    const luteal = calibrateLutealLength([
      { ovulation: d('2026-01-15'), nextPeriodStart: d('2026-01-28') }, // 13
      { ovulation: d('2026-02-14'), nextPeriodStart: d('2026-02-27') }, // 13
    ]);
    expect(luteal).toBe(13);
  });
  it('returns null when nothing is in range', () => {
    expect(calibrateLutealLength([])).toBeNull();
  });
});

describe('irregularity', () => {
  it('flags a wide cycle-length range as irregular', () => {
    expect(confidenceTier(cycleStats([24, 40, 30]))).toBe('irregular');
  });
});
