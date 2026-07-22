import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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
import { fertileWindow, isPmsDay, ovulationCycleDay, phaseForDay } from '@/domain/cycle';
import type { CycleSettings, PhaseId } from '@/domain/types';
import { PHASES } from '@/lib/phases';
import { setPeriodFlow, togglePeriodDay, usePeriodLogs } from '@/lib/periods';
import { setSexualProtection, toggleSexualActivity, useDailyLog } from '@/lib/dailyLog';
import type { FlowLevel, SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { CloudLightningIcon, DropFilledIcon, HeartIcon, OvumIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const FLOWS: ReadonlyArray<{ value: FlowLevel; label: string }> = [
  { value: 'spotting', label: 'Borra' },
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Moderado' },
  { value: 'heavy', label: 'Intenso' },
];

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

  const dayInCycle = (d: Date) => {
    const C = cycleSettings.avgCycleLength;
    const diff = differenceInCalendarDays(d, lastStart);
    return (((diff % C) + C) % C) + 1;
  };
  const phaseOf = (d: Date): PhaseId => phaseForDay(dayInCycle(d), cycleSettings);

  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(iso(today));

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selDate = parseISO(selected);
  const selFuture = isAfter(selDate, today);
  const selLogged = logged.has(selected);
  const selPhase = PHASES[phaseOf(selDate)];
  const daily = useDailyLog(selected);
  const sex = daily?.sexualActivity ?? null;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Calendário</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Toque num dia para registrar.</p>
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
            const isPms = isPmsDay(dayInCycle(d), cycleSettings);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] transition',
                  !inMonth && 'opacity-35',
                  !isLogged && 'hover:bg-white/[0.06]',
                  isSel && !isLogged && 'ring-1 ring-white/30',
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
                {/* Fixed-height marker strip so every cell lines up */}
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

      {/* Selected day — logging actions only */}
      <div className="glass mt-4 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] capitalize text-muted">
            {format(selDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <span className="text-[12px] font-semibold" style={{ color: selPhase.color }}>
            {selPhase.label}
          </span>
        </div>

        {selFuture ? (
          <p className="mt-4 text-[13px] leading-relaxed text-faint">
            Dia futuro — você poderá registrar quando ele chegar.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* 1 — menstruation */}
            <div>
              <LogButton
                active={selLogged}
                accent="var(--color-menstrual)"
                icon={<DropFilledIcon width={18} height={18} />}
                onClick={() => togglePeriodDay(selected)}
              >
                {selLogged ? 'Menstruação registrada' : 'Registrar menstruação'}
              </LogButton>
              {selLogged ? (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {FLOWS.map((f) => (
                    <Chip
                      key={f.value}
                      active={flowMap.get(selected) === f.value}
                      accent="var(--color-menstrual)"
                      onClick={() => setPeriodFlow(selected, f.value)}
                    >
                      {f.label}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 2 — sexual activity */}
            <div>
              <LogButton
                active={Boolean(sex?.logged)}
                accent="var(--color-luteal)"
                icon={<HeartIcon width={18} height={18} />}
                onClick={() => toggleSexualActivity(selected)}
              >
                {sex?.logged ? 'Relação registrada' : 'Registrar relação sexual'}
              </LogButton>
              {sex?.logged ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Chip
                    active={sex.protected === true}
                    accent="var(--color-luteal)"
                    onClick={() => setSexualProtection(selected, true)}
                  >
                    Com proteção
                  </Chip>
                  <Chip
                    active={sex.protected === false}
                    accent="var(--color-luteal)"
                    onClick={() => setSexualProtection(selected, false)}
                  >
                    Sem proteção
                  </Chip>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function LogButton({
  active,
  accent,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  accent: string;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98]"
      style={
        active
          ? { background: accent, color: '#fff' }
          : { border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }
      }
    >
      <span style={active ? undefined : { color: accent }}>{icon}</span>
      {children}
    </button>
  );
}

function Chip({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border py-2 text-[12px] font-medium transition',
        active ? 'border-transparent' : 'border-hairline text-muted hover:text-ink',
      )}
      style={
        active
          ? {
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              boxShadow: `inset 0 0 0 1.5px ${accent}`,
              color: 'var(--color-ink)',
            }
          : undefined
      }
    >
      {children}
    </button>
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
