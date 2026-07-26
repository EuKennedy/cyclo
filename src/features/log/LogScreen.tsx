import { useEffect, useRef, useState, type ReactNode } from 'react';
import { eachDayOfInterval, format, isSameDay, min, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { phaseForDay } from '@/domain/cycle';
import { PHASES } from '@/lib/phases';
import { PHASE_GUIDANCE } from '@/lib/phaseGuidance';
import { setPeriodFlow, togglePeriodDay, usePeriodLogs } from '@/lib/periods';
import {
  setEnergy,
  setSexualProtection,
  toggleMood,
  toggleSexualActivity,
  toggleSymptom,
  useDailyLog,
} from '@/lib/dailyLog';
import { ENERGY_LABELS, MOODS, SYMPTOMS } from '@/lib/logOptions';
import type { FlowLevel, SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { Collapsible } from '@/components/Collapsible';
import { PhaseIcon } from '@/components/PhaseIcon';
import { DropFilledIcon, HeartIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

const FLOWS: ReadonlyArray<{ value: FlowLevel; label: string }> = [
  { value: 'spotting', label: 'Borra' },
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Moderado' },
  { value: 'heavy', label: 'Intenso' },
];

export function LogScreen({
  cycle,
  initialDate,
}: {
  settings: SettingsRecord;
  cycle: CycleState;
  initialDate?: Date | null;
}) {
  const { cycleSettings, lastStart, today } = cycle;
  const todayIso = format(today, 'yyyy-MM-dd');
  const wantIso = initialDate ? format(initialDate, 'yyyy-MM-dd') : todayIso;

  // Keep the internal selection in sync when the calendar hands us a date.
  const [selected, setSelected] = useState(wantIso);
  const [syncedWant, setSyncedWant] = useState(wantIso);
  if (wantIso !== syncedWant) {
    setSyncedWant(wantIso);
    setSelected(wantIso);
  }

  const selDate = parseISO(selected);
  const dayInCycle = (() => {
    const C = cycleSettings.avgCycleLength;
    const diff = Math.round((selDate.getTime() - lastStart.getTime()) / 86400000);
    return (((diff % C) + C) % C) + 1;
  })();
  const phase = phaseForDay(dayInCycle, cycleSettings);
  const meta = PHASES[phase];
  const guide = PHASE_GUIDANCE[phase];

  const logs = usePeriodLogs();
  const periodLog = (logs ?? []).find((l) => l.date === selected);
  const daily = useDailyLog(selected);
  const moods = daily?.mood ?? [];
  const energy = daily?.energy ?? null;
  const symptoms = new Set((daily?.symptoms ?? []).map((s) => s.type));
  const sex = daily?.sexualActivity ?? null;

  // Day rail: a scrollable window ending today, always including the selection.
  const railStart = min([subDays(today, 20), selDate]);
  const railDays = eachDayOfInterval({ start: railStart, end: today });
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selected]);

  return (
    <>
      <header className="mb-4">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Registrar</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Escolha o dia e registre como você esteve.</p>
      </header>

      {/* Day rail */}
      <div className="-mx-6 mb-4 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {railDays.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const isSel = key === selected;
            const isToday = isSameDay(d, today);
            const hasPeriod = (logs ?? []).some((l) => l.date === key);
            return (
              <button
                key={key}
                ref={isSel ? selectedRef : undefined}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  'flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border transition',
                  isSel ? 'border-transparent text-ink' : 'border-hairline text-muted hover:text-ink',
                )}
                style={
                  isSel
                    ? { background: meta.color, color: '#0b0b0b' }
                    : undefined
                }
              >
                <span className="text-[10px] font-medium uppercase">
                  {format(d, 'EEEEEE', { locale: ptBR }).replace('.', '')}
                </span>
                <span className="text-[17px] font-semibold leading-none tabular-nums">
                  {format(d, 'd')}
                </span>
                <span
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: hasPeriod
                      ? isSel
                        ? '#0b0b0b'
                        : 'var(--color-menstrual)'
                      : isToday
                        ? 'currentColor'
                        : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[15px] font-semibold capitalize">
          {isSameDay(selDate, today)
            ? 'Hoje'
            : format(selDate, "EEEE, d 'de' MMM", { locale: ptBR })}
        </p>
        <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: meta.color }}>
          <PhaseIcon phase={phase} colored={false} width={14} height={14} />
          {meta.label}
        </span>
      </div>

      {/* Menstruation */}
      <Section title="Menstruação" icon={<DropFilledIcon width={16} height={16} style={{ color: 'var(--color-menstrual)' }} />}>
        <LogToggle
          active={Boolean(periodLog)}
          accent="var(--color-menstrual)"
          onClick={() => togglePeriodDay(selected)}
        >
          {periodLog ? 'Menstruei neste dia' : 'Registrar menstruação'}
        </LogToggle>
        {periodLog ? (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {FLOWS.map((f) => (
              <Chip
                key={f.value}
                active={periodLog.flow === f.value}
                accent="var(--color-menstrual)"
                onClick={() => setPeriodFlow(selected, f.value)}
              >
                {f.label}
              </Chip>
            ))}
          </div>
        ) : null}
      </Section>

      {/* Feelings */}
      <Section title="Como você se sente">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m} rounded active={moods.includes(m)} onClick={() => toggleMood(selected, m)}>
              {m}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Energy */}
      <Section title={`Energia${energy ? ` · ${ENERGY_LABELS[energy]}` : ''}`}>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              aria-label={`Energia ${level}`}
              onClick={() => setEnergy(selected, level as 1 | 2 | 3 | 4 | 5)}
              className="h-9 flex-1 rounded-xl border transition"
              style={
                (energy ?? 0) >= level
                  ? { background: 'var(--phase)', borderColor: 'transparent' }
                  : { borderColor: 'var(--color-hairline)' }
              }
            />
          ))}
        </div>
      </Section>

      {/* Symptoms */}
      <Section title="Sintomas">
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip key={s} rounded active={symptoms.has(s)} onClick={() => toggleSymptom(selected, s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Sexual activity */}
      <Section title="Relação sexual" icon={<HeartIcon width={16} height={16} style={{ color: 'var(--color-luteal)' }} />}>
        <LogToggle
          active={Boolean(sex?.logged)}
          accent="var(--color-luteal)"
          onClick={() => toggleSexualActivity(selected)}
        >
          {sex?.logged ? 'Registrada' : 'Registrar relação'}
        </LogToggle>
        {sex?.logged ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Chip active={sex.protected === true} accent="var(--color-luteal)" onClick={() => setSexualProtection(selected, true)}>
              Com proteção
            </Chip>
            <Chip active={sex.protected === false} accent="var(--color-luteal)" onClick={() => setSexualProtection(selected, false)}>
              Sem proteção
            </Chip>
          </div>
        ) : null}
      </Section>

      <div className="mt-3">
        <Collapsible
          title={`Dicas para a ${guide.name.toLowerCase()}`}
          icon={<PhaseIcon phase={phase} width={20} height={20} />}
        >
          <ul className="space-y-1.5">
            {guide.tips.slice(0, 5).map((t) => (
              <li key={t} className="flex gap-2 text-[13px] leading-snug text-muted">
                <span style={{ color: meta.color }}>•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        Tudo o que você registra fica só neste dispositivo.
      </p>
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass mt-3 rounded-3xl p-5 first:mt-0">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-[13px] font-semibold">{title}</p>
      </div>
      {children}
    </section>
  );
}

function LogToggle({
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
      className="flex h-[50px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition active:scale-[0.98]"
      style={active ? { background: accent, color: '#fff' } : { border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  accent = 'var(--phase)',
  rounded,
  onClick,
  children,
}: {
  active: boolean;
  accent?: string;
  rounded?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border px-3.5 py-2 text-[12.5px] font-medium transition active:scale-[0.97]',
        rounded ? 'rounded-full' : 'rounded-xl',
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
