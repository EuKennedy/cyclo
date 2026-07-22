import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PHASES } from '@/lib/phases';
import { PHASE_GUIDANCE } from '@/lib/phaseGuidance';
import { setPeriodFlow, togglePeriodDay, usePeriodLogs } from '@/lib/periods';
import { setEnergy, toggleMood, toggleSymptom, useDailyLog } from '@/lib/dailyLog';
import { ENERGY_LABELS, MOODS, SYMPTOMS } from '@/lib/logOptions';
import type { FlowLevel, SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { cn } from '@/lib/cn';

const FLOWS: ReadonlyArray<{ value: FlowLevel; label: string }> = [
  { value: 'spotting', label: 'Borra' },
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Moderado' },
  { value: 'heavy', label: 'Intenso' },
];

export function LogScreen({ cycle }: { settings: SettingsRecord; cycle: CycleState }) {
  const { status, today } = cycle;
  const todayIso = format(today, 'yyyy-MM-dd');
  const logs = usePeriodLogs();
  const loggedToday = (logs ?? []).find((l) => l.date === todayIso);
  const daily = useDailyLog(todayIso);
  const meta = PHASES[status.phase];
  const guide = PHASE_GUIDANCE[status.phase];

  const moods = daily?.mood ?? [];
  const energy = daily?.energy ?? null;
  const symptoms = new Set((daily?.symptoms ?? []).map((s) => s.type));

  return (
    <>
      <header className="mb-6">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Registrar</h1>
        <p className="mt-1 text-[0.9rem] capitalize text-muted">
          {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </header>

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-[13px] uppercase tracking-[0.14em] text-faint">Hoje você está na</span>
          <span className="text-[15px] font-semibold" style={{ color: meta.color }}>
            {guide.name}
          </span>
        </div>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{guide.whatsHappening}</p>
        <p className="mb-2 mt-4 text-[12px] font-medium uppercase tracking-[0.12em] text-faint">
          O que ajuda hoje
        </p>
        <ul className="space-y-1.5">
          {guide.tips.slice(0, 4).map((t) => (
            <li key={t} className="flex gap-2 text-[13px] leading-snug text-muted">
              <span style={{ color: meta.color }}>•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="text-[15px] font-semibold">Você está menstruada hoje?</p>
        <button
          type="button"
          onClick={() => togglePeriodDay(todayIso)}
          className="mt-3 flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition active:scale-[0.98]"
          style={
            loggedToday
              ? { background: 'var(--color-menstrual)', color: 'var(--color-void)' }
              : { border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }
          }
        >
          {loggedToday ? 'Sim, registrado ✓' : 'Registrar menstruação'}
        </button>
        {loggedToday ? (
          <div className="mt-4">
            <Label>Intensidade do fluxo</Label>
            <div className="grid grid-cols-4 gap-2">
              {FLOWS.map((f) => (
                <Pill
                  key={f.value}
                  active={loggedToday.flow === f.value}
                  accent="var(--color-menstrual)"
                  onClick={() => setPeriodFlow(todayIso, f.value)}
                >
                  {f.label}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <Label>Como você está se sentindo?</Label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m} active={moods.includes(m)} onClick={() => toggleMood(todayIso, m)}>
              {m}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Energia{energy ? ` · ${ENERGY_LABELS[energy]}` : ''}</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Energia ${n}`}
              onClick={() => setEnergy(todayIso, n as 1 | 2 | 3 | 4 | 5)}
              className="h-9 flex-1 rounded-xl border transition"
              style={
                (energy ?? 0) >= n
                  ? { background: 'var(--phase)', borderColor: 'transparent' }
                  : { borderColor: 'var(--color-hairline)' }
              }
            />
          ))}
        </div>
      </Card>

      <Card>
        <Label>Sintomas</Label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip key={s} active={symptoms.has(s)} onClick={() => toggleSymptom(todayIso, s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Card>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        Tudo o que você registra fica só neste dispositivo.
      </p>
    </>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="glass mt-4 rounded-3xl p-5 first:mt-0">{children}</div>;
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 text-[13px] font-medium text-muted">{children}</p>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-[0.97]',
        active ? 'border-transparent' : 'border-hairline text-muted hover:text-ink',
      )}
      style={
        active
          ? {
              background: 'color-mix(in srgb, var(--phase) 16%, transparent)',
              boxShadow: 'inset 0 0 0 1.5px var(--phase)',
              color: 'var(--color-ink)',
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function Pill({
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
