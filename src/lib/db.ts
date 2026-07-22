import Dexie, { type EntityTable } from 'dexie';

/**
 * Local-first storage. The device is the source of truth (docs/RESEARCH-SPEC.md
 * §4 & §7). Everything works offline with no account. Dates are stored as
 * 'YYYY-MM-DD' strings at local midnight — never timestamps — to avoid drift.
 *
 * Every record carries a stable id + updatedAt so it can later be wrapped in an
 * AEAD envelope and synced as ciphertext, without the server ever seeing health
 * fields in plaintext.
 */

export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export type LifeStage = 'adolescent' | 'adult' | 'perimenopause';
export type CycleGoal = 'track' | 'understand' | 'conceive';

export interface SettingsRecord {
  id: 'user';
  /* Personal basics — stored ONLY on this device (local-first). */
  name: string;
  email: string;
  phone: string;
  /* Cycle model inputs. */
  lastPeriodStart: string | null; // YYYY-MM-DD (selected on the calendar)
  avgCycleLength: number;
  avgPeriodLength: number;
  lutealLengthOverride: number | null;
  lifeStage: LifeStage;
  goal: CycleGoal;
  onboardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CycleRecord {
  id: string;
  startDate: string; // day 1
  endDate: string | null; // null while active
  lengthDays: number | null;
  periodLengthDays: number | null;
  isPredicted: boolean;
  ovulationConfirmed: boolean;
  confirmedOvulationDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodLogRecord {
  id: string;
  date: string;
  cycleId: string | null;
  flow: FlowLevel;
  isStartDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SymptomEntry {
  type: string;
  intensity: 1 | 2 | 3;
}

export interface DailyLogRecord {
  id: string;
  date: string;
  cycleId: string | null;
  cycleDay: number | null;
  mood: string[];
  energy: 1 | 2 | 3 | 4 | 5 | null;
  symptoms: SymptomEntry[];
  bbt: number | null; // measurement — feeds luteal calibration
  lhTest: 'positive' | 'negative' | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CycloDB extends Dexie {
  settings!: EntityTable<SettingsRecord, 'id'>;
  cycles!: EntityTable<CycleRecord, 'id'>;
  periodLogs!: EntityTable<PeriodLogRecord, 'id'>;
  dailyLogs!: EntityTable<DailyLogRecord, 'id'>;

  constructor() {
    super('cyclo');
    this.version(1).stores({
      settings: 'id',
      cycles: 'id, startDate',
      periodLogs: 'id, date, cycleId',
      dailyLogs: 'id, date, cycleId',
    });
  }
}

export const db = new CycloDB();
