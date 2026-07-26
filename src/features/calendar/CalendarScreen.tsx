import { useMemo, useState, type CSSProperties } from 'react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fertileWindow, isPmsDay, ovulationCycleDay, phaseForDay } from '@/domain/cycle';
import type { CycleSettings, PhaseId } from '@/domain/types';
import { PHASES } from '@/lib/phases';
import { usePeriodLogs } from '@/lib/periods';
import type { SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { CloudLightningIcon, DropFilledIcon, OvumIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function project(lastStart: Date, s: CycleSettings) {
  const period = new Set<string>();
  const fertile = new Set<string>();
  const ovulation = new Set<string>();
  const ovDay = ovulationCycleDay(s);
  const fw = fertileWindow(s);
  for (let k = -1; k <= 4; k++) {
    const cs = addDays(lastStart, k * s.avgCycleLength);
    for (let i = 0; i < s.avgPeriodLength; i++) period.add(iso(addDays(cs, i)));
    ovulation.add(iso(addDays(cs, ovDay - 1)));
    for (let d = fw.startDay; d <= fw.endDay; d++) fertile.add(iso(addDays(cs, d - 1)));
  }
  return { period, fertile, ovulation };
}

export function CalendarScreen({
  cycle,
  onPickDay,
}: {
  settings: SettingsRecord;
  cycle: CycleState;
  onPickDay: (date: Date) => void;
}) {
  const { cycleSettings, lastStart, today } = cycle;
  const logs = usePeriodLogs();
  const logged = useMemo(() => new Set((logs ?? []).map((l) => l.date)), [logs]);
  const proj = useMemo(() => project(lastStart, cycleSettings), [lastStart, cycleSettings]);

  const dayInCycle = (d: Date) => {
    const C = cycleSettings.avgCycleLength;
    const diff = differenceInCalendarDays(d, lastStart);
    return (((diff % C) + C) % C) + 1;
  };
  const phaseOf = (d: Date): PhaseId => phaseForDay(dayInCycle(d), cycleSettings);

  const [month, setMonth] = useState(startOfMonth(today));
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <>
      <header className="mb-5">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Calendário</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Toque num dia para ver e registrar.</p>
      </header>

      <div className="glass rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <NavBtn label="‹" onClick={() => setMonth(subMonths(month, 1))} />
          <span className="text-[15px] font-semibold capitalize">
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <NavBtn label="›" onClick={() => setMonth(addMonths(month, 1))} />
        </div>

        <div className="mb-1.5 grid grid-cols-7 text-center text-[11px] font-medium text-faint">
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = iso(d);
            const inMonth = isSameMonth(d, month);
            const isToday = isSameDay(d, today);
            const isLogged = logged.has(key);
            const isFuture = isAfter(d, today);
            const isPredPeriod = !isLogged && isFuture && proj.period.has(key);
            const isOv = proj.ovulation.has(key);
            const isFertile = !isOv && proj.fertile.has(key);
            const isPms = isPmsDay(dayInCycle(d), cycleSettings);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPickDay(d)}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] transition',
                  !inMonth && 'opacity-35',
                  !isLogged && 'hover:bg-white/[0.06]',
                )}
                style={
                  isLogged
                    ? { background: 'var(--color-menstrual)', color: '#fff', fontWeight: 600 }
                    : isPredPeriod
                      ? {
                          boxShadow: 'inset 0 0 0 1.3px color-mix(in srgb, var(--color-menstrual) 60%, transparent)',
                          color: 'var(--color-menstrual)',
                        }
                      : inMonth
                        ? { background: `color-mix(in srgb, ${PHASES[phaseOf(d)].color} 12%, transparent)` }
                        : undefined
                }
              >
                <span className="leading-none">{format(d, 'd')}</span>
                <span className="mt-[3px] flex h-[11px] items-center justify-center gap-[3px]">
                  {isPms && inMonth ? (
                    <CloudLightningIcon
                      width={10}
                      height={10}
                      style={{ color: isLogged ? '#fff' : 'var(--color-luteal)' }}
                    />
                  ) : null}
                  {!isLogged && (isOv || isFertile) ? (
                    <span
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ background: 'var(--color-ovulatory)', opacity: isOv ? 1 : 0.55 }}
                    />
                  ) : null}
                </span>
                {isToday && !isLogged ? (
                  <span className="absolute inset-0 rounded-xl ring-1 ring-white/60" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-hairline pt-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <DropFilledIcon width={12} height={12} style={{ color: 'var(--color-menstrual)' }} />
            Menstruação
          </span>
          <Legend swatchStyle={{ boxShadow: 'inset 0 0 0 1.3px var(--color-menstrual)' }} label="Previsão" />
          <span className="inline-flex items-center gap-1.5">
            <OvumIcon width={12} height={12} style={{ color: 'var(--color-ovulatory)' }} />
            Fértil
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CloudLightningIcon width={12} height={12} style={{ color: 'var(--color-luteal)' }} />
            TPM
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPickDay(today)}
        className="mt-4 flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition active:scale-[0.98]"
        style={{ background: 'var(--phase)', color: '#0b0b0b' }}
      >
        Registrar hoje
      </button>
    </>
  );
}

function NavBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white/[0.04] text-muted transition hover:text-ink"
    >
      {label}
    </button>
  );
}

function Legend({ swatchStyle, label }: { swatchStyle: CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-md" style={swatchStyle} />
      {label}
    </span>
  );
}
