import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
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
