import { useMemo } from 'react';
import { parseISO, startOfDay } from 'date-fns';
import { getCycleStatus } from '@/domain/cycle';
import { estimateCycleLength, type CycleEstimate } from '@/domain/predictions';
import type { CycleSettings, CycleStatus } from '@/domain/types';
import { toCycleSettings } from './settings';
import { derivePeriodStarts, usePeriodDates } from './periods';
import type { SettingsRecord } from './db';

export interface CycleState {
  /** Effective settings — cycle length is personalized once enough history exists. */
  cycleSettings: CycleSettings;
  status: CycleStatus;
  lastStart: Date;
  starts: Date[];
  periodDates: Set<string>;
  today: Date;
  loading: boolean;
  /** History-based cycle-length estimate (confidence, irregularity, fallback). */
  estimate: CycleEstimate;
}

/** Central cycle state, derived from settings + logged period days. */
export function useCycleState(settings: SettingsRecord): CycleState {
  const periodDatesArr = usePeriodDates();

  return useMemo(() => {
    const base = toCycleSettings(settings);
    const today = startOfDay(new Date());
    const dates = periodDatesArr ?? [];
    const starts = derivePeriodStarts(dates);

    const estimate = estimateCycleLength(starts);
    // Personalize cycle length only once we have real history; otherwise keep the
    // user's onboarding value (better than a population fallback).
    const cycleSettings: CycleSettings = estimate.usedFallback
      ? base
      : { ...base, avgCycleLength: Math.max(21, Math.round(estimate.avg)) };

    const lastStart = starts.length
      ? starts[starts.length - 1]!
      : parseISO(settings.lastPeriodStart as string);
    const status = getCycleStatus(lastStart, cycleSettings, today);

    return {
      cycleSettings,
      status,
      lastStart,
      starts,
      periodDates: new Set(dates),
      today,
      loading: periodDatesArr === undefined,
      estimate,
    };
  }, [settings, periodDatesArr]);
}
