import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PHASES } from '@/lib/phases';
import { setPeriodFlow, togglePeriodDay, usePeriodLogs } from '@/lib/periods';
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
  const logs = usePeriodLogs();
  const todayIso = format(today, 'yyyy-MM-dd');
  const loggedToday = (logs ?? []).find((l) => l.date === todayIso);
  const meta = PHASES[status.phase];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Registrar</h1>
        <p className="mt-1 text-[0.9rem] capitalize text-muted">
          {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </header>

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] uppercase tracking-[0.14em] text-faint">Hoje você está em</span>
          <span className="text-display text-lg font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{meta.line}</p>
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
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
            <p className="mb-2 text-[12px] text-muted">Intensidade do fluxo</p>
            <div className="grid grid-cols-4 gap-2">
              {FLOWS.map((f) => {
                const active = loggedToday.flow === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setPeriodFlow(todayIso, f.value)}
                    className={cn(
                      'rounded-xl border py-2 text-[12px] font-medium transition',
                      active ? 'border-transparent' : 'border-hairline text-muted hover:text-ink',
                    )}
                    style={
                      active
                        ? {
                            background: 'color-mix(in srgb, var(--color-menstrual) 18%, transparent)',
                            boxShadow: 'inset 0 0 0 1.5px var(--color-menstrual)',
                            color: 'var(--color-ink)',
                          }
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

      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        Registro de humor, energia e sintomas chega no próximo passo do Cyclo.
      </p>
    </>
  );
}
