import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, format, isAfter, parseISO, startOfDay } from 'date-fns';
import { db, type SettingsRecord, type LifeStage, type CycleGoal } from './db';
import { CYCLE } from '@/domain/constants';
import type { CycleSettings } from '@/domain/types';

export const USER_ID = 'user' as const;

/** `undefined` while loading, `null` when no profile exists yet, else the record. */
export function useSettings(): SettingsRecord | null | undefined {
  return useLiveQuery(async () => (await db.settings.get(USER_ID)) ?? null, []);
}

export interface OnboardingInput {
  name: string;
  email: string;
  phone: string;
  lastPeriodStart: string; // YYYY-MM-DD
  avgCycleLength: number;
  avgPeriodLength: number;
  lifeStage: LifeStage;
  goal: CycleGoal;
}

export async function saveOnboarding(input: OnboardingInput): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.settings.get(USER_ID);
  const record: SettingsRecord = {
    id: USER_ID,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    lastPeriodStart: input.lastPeriodStart,
    avgCycleLength: input.avgCycleLength,
    avgPeriodLength: input.avgPeriodLength,
    lutealLengthOverride: existing?.lutealLengthOverride ?? null,
    lifeStage: input.lifeStage,
    goal: input.goal,
    onboardedAt: existing?.onboardedAt ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.settings.put(record);

  // Seed the onboarded last period as logged bleeding days (up to today), so the
  // calendar reflects it and predictions derive uniformly from logged data.
  const start = parseISO(input.lastPeriodStart);
  const todayStart = startOfDay(new Date());
  for (let i = 0; i < input.avgPeriodLength; i++) {
    const day = addDays(start, i);
    if (isAfter(startOfDay(day), todayStart)) break;
    const iso = format(day, 'yyyy-MM-dd');
    const exists = await db.periodLogs.where('date').equals(iso).first();
    if (!exists) {
      await db.periodLogs.add({
        id: crypto.randomUUID(),
        date: iso,
        cycleId: null,
        flow: 'medium',
        isStartDay: i === 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

/** Patch a subset of settings fields (e.g. from the Settings screen). */
export async function updateSettings(patch: Partial<Omit<SettingsRecord, 'id'>>): Promise<void> {
  await db.settings.update(USER_ID, { ...patch, updatedAt: new Date().toISOString() });
}

/** Wipe everything — a true local purge (no soft-delete). */
export async function purgeAll(): Promise<void> {
  await Promise.all([db.settings.clear(), db.cycles.clear(), db.periodLogs.clear(), db.dailyLogs.clear()]);
}

export function toCycleSettings(r: SettingsRecord): CycleSettings {
  return {
    avgCycleLength: r.avgCycleLength,
    avgPeriodLength: r.avgPeriodLength,
    lutealLength: r.lutealLengthOverride ?? CYCLE.LUTEAL_LENGTH,
  };
}

export function isOnboarded(r: SettingsRecord | null | undefined): r is SettingsRecord {
  return Boolean(r && r.onboardedAt && r.lastPeriodStart);
}

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');
