import type { ReactNode } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ConfidenceTier } from '@/domain/types';
import { PHASES } from '@/lib/phases';
import { PHASE_GUIDANCE } from '@/lib/phaseGuidance';
import type { SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { CycleRing } from '@/components/CycleRing';

const CONFIDENCE_LABEL: Record<ConfidenceTier, string> = {
  'very-high': 'Ótima',
  high: 'Alta',
  moderate: 'Média',
  low: 'Baixa',
  irregular: 'Irregular',
  insufficient: '—',
};

export function HomeScreen({ settings, cycle }: { settings: SettingsRecord; cycle: CycleState }) {
  const { cycleSettings, status, lastStart, today } = cycle;
  const meta = PHASES[status.phase];
  const guide = PHASE_GUIDANCE[status.phase];
  const firstName = settings.name.trim().split(/\s+/)[0] || 'você';

  const fertileStart = addDays(lastStart, status.fertileWindow.startDay - 1);
  const fertileEnd = addDays(lastStart, status.fertileWindow.endDay - 1);

  const hero =
    status.phase === 'menstrual'
      ? { big: `Dia ${status.cycleDay}`, label: 'da sua menstruação', sub: null }
      : status.isLate
        ? {
            big: String(status.lateBy),
            label: status.lateBy === 1 ? 'dia de atraso' : 'dias de atraso',
            sub: 'Já começou? Registre na aba Registrar.',
          }
        : {
            big: String(status.daysUntilNextPeriod),
            label: status.daysUntilNextPeriod === 1 ? 'dia até a menstruação' : 'dias até a menstruação',
            sub: `Prevista para ${format(status.nextPredictedStart, "d 'de' MMMM", { locale: ptBR })}`,
          };

  return (
    <>
      <header className="flex items-center justify-between">
        <span className="text-display text-xl font-semibold tracking-tight">Cyclo</span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-faint">
          {format(today, "EEE, d 'de' MMM", { locale: ptBR })}
        </span>
      </header>

      <p className="mt-4 text-[0.95rem] text-muted">Olá, {firstName}</p>

      {/* Countdown hero — the clear headline */}
      <section className="mt-2">
        <div className="flex items-end gap-3">
          <span className="text-display text-[4.6rem] font-bold leading-[0.85]" style={{ color: meta.color }}>
            {hero.big}
          </span>
          <span className="mb-2 text-[1.05rem] leading-tight text-ink">{hero.label}</span>
        </div>
        {hero.sub ? <p className="mt-2 text-[13px] text-muted">{hero.sub}</p> : null}
      </section>

      {/* Ring */}
      <section className="mt-6 flex flex-col items-center">
        <CycleRing settings={cycleSettings} status={status} size={300}>
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted">Dia do ciclo</span>
          <span className="text-display text-[4.6rem] font-semibold leading-[0.9]">{status.cycleDay}</span>
          <span className="mt-1 text-sm font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </CycleRing>
      </section>

      {/* Serious phase guidance */}
      <section className="glass mt-7 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.14em] text-faint">Você está na</span>
          <span className="text-[15px] font-semibold" style={{ color: meta.color }}>
            {guide.name} · {guide.dayRange}
          </span>
        </div>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted">{guide.whatsHappening}</p>

        <SectionLabel>Sintomas comuns</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {guide.symptoms.map((s) => (
            <span
              key={s}
              className="rounded-full border border-hairline px-2.5 py-1 text-[12px] text-muted"
            >
              {s}
            </span>
          ))}
        </div>

        <SectionLabel>O que ajuda</SectionLabel>
        <ul className="space-y-1.5">
          {guide.tips.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] leading-snug text-muted">
              <span style={{ color: meta.color }}>•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>

        {guide.fertilityNote ? (
          <p className="mt-4 rounded-xl bg-white/[0.03] p-3 text-[12px] leading-relaxed text-faint">
            {guide.fertilityNote}
          </p>
        ) : null}
      </section>

      {/* Fertile window */}
      <section className="glass mt-4 rounded-[22px] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-faint">Período fértil</p>
            <p className="text-display mt-1 text-lg leading-tight">
              {format(fertileStart, "d 'de' MMM", { locale: ptBR })} –{' '}
              {format(fertileEnd, "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{
              color: 'var(--color-ovulatory)',
              background: 'color-mix(in srgb, var(--color-ovulatory) 14%, transparent)',
            }}
          >
            {status.isFertile ? 'Fértil agora' : `Ovulação dia ${status.ovulationDay}`}
          </span>
        </div>
      </section>

      {/* History / confidence */}
      <section className="glass mt-4 rounded-[22px] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-faint">Seu histórico</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat value={String(cycle.starts.length)} label={cycle.starts.length === 1 ? 'ciclo' : 'ciclos'} />
          <Stat
            value={`${Math.round(cycle.estimate.usedFallback ? cycleSettings.avgCycleLength : cycle.estimate.avg)}d`}
            label="ciclo médio"
          />
          <Stat value={CONFIDENCE_LABEL[cycle.estimate.confidence]} label="confiança" />
        </div>
        {cycle.estimate.usedFallback ? (
          <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
            Registre mais ciclos e as previsões ficam cada vez mais precisas.
          </p>
        ) : null}
      </section>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        Estimativas baseadas em médias — não são um método contraceptivo nem substituem orientação médica.
      </p>
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-4 text-[12px] font-medium uppercase tracking-[0.12em] text-faint">{children}</p>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-display text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-faint">{label}</p>
    </div>
  );
}
