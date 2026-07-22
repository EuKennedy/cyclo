import { useMemo } from 'react';
import { parseISO, startOfDay } from 'date-fns';
import { getCycleStatus } from '@/domain/cycle';
import type { CycleSettings, CycleStatus } from '@/domain/types';
import { toCycleSettings } from './settings';
import { derivePeriodStarts, usePeriodDates } from './periods';
import type { SettingsRecord } from './db';

export interface CycleState {
  cycleSettings: CycleSettings;
  status: CycleStatus;
  /** First day of the most recent (current) cycle. */
  lastStart: Date;
  /** All derived cycle-start dates, ascending. */
  starts: Date[];
  /** Set of logged bleeding-day date strings. */
  periodDates: Set<string>;
  today: Date;
  loading: boolean;
}

/** Central cycle state, derived from settings + logged period days. */
export function useCycleState(settings: SettingsRecord): CycleState {
  const periodDatesArr = usePeriodDates();

  return useMemo(() => {
    const cycleSettings = toCycleSettings(settings);
    const today = startOfDay(new Date());
    const dates = periodDatesArr ?? [];
    const starts = derivePeriodStarts(dates);
    const lastStart = starts.length ? starts[starts.length - 1]! : parseISO(settings.lastPeriodStart as string);
    const status = getCycleStatus(lastStart, cycleSettings, today);
    return {
      cycleSettings,
      status,
      lastStart,
      starts,
      periodDates: new Set(dates),
      today,
      loading: periodDatesArr === undefined,
    };
  }, [settings, periodDatesArr]);
}
