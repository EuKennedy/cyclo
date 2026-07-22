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
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fertileWindow, ovulationCycleDay, phaseForDay } from '@/domain/cycle';
import type { CycleSettings } from '@/domain/types';
import { PHASES } from '@/lib/phases';
import { setPeriodFlow, togglePeriodDay, usePeriodLogs } from '@/lib/periods';
import type { FlowLevel, SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const FLOWS: ReadonlyArray<{ value: FlowLevel; label: string }> = [
  { value: 'spotting', label: 'Borra' },
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Moderado' },
  { value: 'heavy', label: 'Intenso' },
];

/** Project period / fertile / ovulation dates across nearby cycles. */
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

export function CalendarScreen({ cycle }: { settings: SettingsRecord; cycle: CycleState }) {
  const { cycleSettings, lastStart, today } = cycle;
  const logs = usePeriodLogs();
  const logged = useMemo(() => new Set((logs ?? []).map((l) => l.date)), [logs]);
  const flowMap = useMemo(() => new Map((logs ?? []).map((l) => [l.date, l.flow])), [logs]);
  const proj = useMemo(() => project(lastStart, cycleSettings), [lastStart, cycleSettings]);

  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(iso(today));

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selDate = parseISO(selected);
  const selFuture = isAfter(selDate, today);
  const selLogged = logged.has(selected);
  const selDiff = differenceInCalendarDays(selDate, lastStart);
  const selDayInCycle = (((selDiff % cycleSettings.avgCycleLength) + cycleSettings.avgCycleLength) % cycleSettings.avgCycleLength) + 1;
  const selPhase = PHASES[phaseForDay(selDayInCycle, cycleSettings)];

  return (
    <>
      <header className="mb-5">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Calendário</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Toque num dia para registrar sua menstruação.</p>
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
            const isSel = key === selected;
            const isLogged = logged.has(key);
            const isFuture = isAfter(d, today);
            const isPredPeriod = !isLogged && isFuture && proj.period.has(key);
            const isOv = proj.ovulation.has(key);
            const isFertile = !isOv && proj.fertile.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] transition',
                  !inMonth && 'opacity-35',
                  !isLogged && 'hover:bg-white/[0.06]',
                  isSel && !isLogged && 'ring-1 ring-white/25',
                )}
                style={
                  isLogged
                    ? { background: 'var(--color-menstrual)', color: 'var(--color-void)', fontWeight: 600 }
                    : isPredPeriod
                      ? { boxShadow: 'inset 0 0 0 1.3px color-mix(in srgb, var(--color-menstrual) 60%, transparent)', color: 'var(--color-menstrual)' }
                      : undefined
                }
              >
                <span>{format(d, 'd')}</span>
                {isToday && !isLogged ? (
                  <span className="absolute inset-0 rounded-xl ring-1 ring-white/60" />
                ) : null}
                {!isLogged && (isOv || isFertile) ? (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full"
                    style={{ background: isOv ? 'var(--color-ovulatory)' : 'var(--color-ovulatory)', opacity: isOv ? 1 : 0.5 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hairline pt-3 text-[11px] text-muted">
          <Legend swatchStyle={{ background: 'var(--color-menstrual)' }} label="Menstruação" />
          <Legend swatchStyle={{ boxShadow: 'inset 0 0 0 1.3px var(--color-menstrual)' }} label="Previsão" />
          <Legend dot="var(--color-ovulatory)" label="Fértil / ovulação" />
        </div>
      </div>

      {/* Selected-day detail */}
      <div className="glass mt-4 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] capitalize text-muted">
              {format(selDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-display mt-0.5 text-lg font-semibold" style={{ color: selPhase.color }}>
              {selPhase.label}
            </p>
          </div>
          {isSameDay(selDate, today) ? (
            <span className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted">Hoje</span>
          ) : null}
        </div>

        {selFuture ? (
          <p className="mt-4 text-[13px] leading-relaxed text-faint">
            Dia futuro — você poderá registrar quando ele chegar.
          </p>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => togglePeriodDay(selected)}
              className="flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition active:scale-[0.98]"
              style={
                selLogged
                  ? { background: 'var(--color-menstrual)', color: 'var(--color-void)' }
                  : { border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }
              }
            >
              {selLogged ? 'Menstruação registrada ✓' : 'Menstruei neste dia'}
            </button>

            {selLogged ? (
              <div className="mt-3">
                <p className="mb-2 text-[12px] text-muted">Fluxo</p>
                <div className="grid grid-cols-4 gap-2">
                  {FLOWS.map((f) => {
                    const active = flowMap.get(selected) === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setPeriodFlow(selected, f.value)}
                        className={cn(
                          'rounded-xl border py-2 text-[12px] font-medium transition',
                          active ? 'border-transparent' : 'border-hairline text-muted hover:text-ink',
                        )}
                        style={
                          active
                            ? { background: 'color-mix(in srgb, var(--color-menstrual) 18%, transparent)', boxShadow: 'inset 0 0 0 1.5px var(--color-menstrual)', color: 'var(--color-ink)' }
                            : undefined
                        }
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
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

function Legend({ swatchStyle, dot, label }: { swatchStyle?: CSSProperties; dot?: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      ) : (
        <span className="h-3 w-3 rounded-md" style={swatchStyle} />
      )}
      {label}
    </span>
  );
}
