import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DailyLogRecord, type SymptomEntry } from './db';

type Energy = DailyLogRecord['energy'];

/** Live daily-log record for a date (`null` when nothing logged yet). */
export function useDailyLog(dateISO: string): DailyLogRecord | null | undefined {
  return useLiveQuery(
    async () => (await db.dailyLogs.where('date').equals(dateISO).first()) ?? null,
    [dateISO],
  );
}

async function ensure(dateISO: string): Promise<DailyLogRecord> {
  const existing = await db.dailyLogs.where('date').equals(dateISO).first();
  if (existing) return existing;
  const now = new Date().toISOString();
  const rec: DailyLogRecord = {
    id: crypto.randomUUID(),
    date: dateISO,
    cycleId: null,
    cycleDay: null,
    mood: [],
    energy: null,
    symptoms: [],
    bbt: null,
    lhTest: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.dailyLogs.add(rec);
  return rec;
}

export async function toggleMood(dateISO: string, mood: string): Promise<void> {
  const rec = await ensure(dateISO);
  const set = new Set(rec.mood);
  if (set.has(mood)) set.delete(mood);
  else set.add(mood);
  await db.dailyLogs.update(rec.id, { mood: [...set], updatedAt: new Date().toISOString() });
}

export async function setEnergy(dateISO: string, energy: Energy): Promise<void> {
  const rec = await ensure(dateISO);
  await db.dailyLogs.update(rec.id, {
    energy: rec.energy === energy ? null : energy,
    updatedAt: new Date().toISOString(),
  });
}

export async function toggleSymptom(dateISO: string, type: string): Promise<void> {
  const rec = await ensure(dateISO);
  const exists = rec.symptoms.some((s) => s.type === type);
  const symptoms: SymptomEntry[] = exists
    ? rec.symptoms.filter((s) => s.type !== type)
    : [...rec.symptoms, { type, intensity: 2 }];
  await db.dailyLogs.update(rec.id, { symptoms, updatedAt: new Date().toISOString() });
}
