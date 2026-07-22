import { useLiveQuery } from 'dexie-react-hooks';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { db, type FlowLevel, type PeriodLogRecord } from './db';

/**
 * Period-logging repository. One record per logged bleeding day. Cycle "starts"
 * are DERIVED from the days (the first day of each consecutive run), so the
 * whole prediction pipeline stays a pure function of what the user logged.
 */

/** Live-updating sorted list of logged bleeding-day dates (YYYY-MM-DD). */
export function usePeriodDates(): string[] | undefined {
  return useLiveQuery(
    () => db.periodLogs.orderBy('date').toArray().then((rows) => rows.map((r) => r.date)),
    [],
  );
}

/** Live-updating full period-log records (with flow), ascending by date. */
export function usePeriodLogs(): PeriodLogRecord[] | undefined {
  return useLiveQuery(() => db.periodLogs.orderBy('date').toArray(), []);
}

/** Toggle a bleeding day on/off. Returns the new state (true = now logged). */
export async function togglePeriodDay(dateISO: string, flow: FlowLevel = 'medium'): Promise<boolean> {
  const existing = await db.periodLogs.where('date').equals(dateISO).first();
  if (existing) {
    await db.periodLogs.delete(existing.id);
    return false;
  }
  const now = new Date().toISOString();
  await db.periodLogs.add({
    id: crypto.randomUUID(),
    date: dateISO,
    cycleId: null,
    flow,
    isStartDay: false,
    createdAt: now,
    updatedAt: now,
  });
  return true;
}

/** Set (or create) the flow intensity for a given day. */
export async function setPeriodFlow(dateISO: string, flow: FlowLevel): Promise<void> {
  const existing = await db.periodLogs.where('date').equals(dateISO).first();
  const now = new Date().toISOString();
  if (existing) {
    await db.periodLogs.update(existing.id, { flow, updatedAt: now });
  } else {
    await db.periodLogs.add({
      id: crypto.randomUUID(),
      date: dateISO,
      cycleId: null,
      flow,
      isStartDay: false,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/** Group logged day-strings into cycle-start dates (first day of each run;
 * a gap greater than one calendar day begins a new cycle). */
export function derivePeriodStarts(dates: readonly string[]): Date[] {
  const sorted = [...new Set(dates)].sort();
  const starts: Date[] = [];
  let prev: Date | null = null;
  for (const iso of sorted) {
    const d = parseISO(iso);
    if (!prev || differenceInCalendarDays(d, prev) > 1) starts.push(d);
    prev = d;
  }
  return starts;
}
