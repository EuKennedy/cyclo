import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { phaseForDay } from '@/domain/cycle';
import { cycleLengthsFromStarts } from '@/domain/predictions';
import type { CycleStatus } from '@/domain/types';
import { PHASES, PHASE_HEX } from '@/lib/phases';
import { PHASE_GUIDANCE } from '@/lib/phaseGuidance';
import type { SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { CycleRing } from '@/components/CycleRing';
import { Collapsible } from '@/components/Collapsible';
import { BarChart } from '@/components/charts';
import { DropFilledIcon } from '@/components/icons';

export function HomeScreen({ settings, cycle }: { settings: SettingsRecord; cycle: CycleState }) {
  const { cycleSettings, status: realStatus, lastStart } = cycle;
  const n = cycleSettings.avgCycleLength;

  const realDay = Math.min(realStatus.cycleDay, n);
  const [selectedDay, setSelectedDay] = useState(realDay);
  // Snap back to today when the underlying cycle day changes (new day, new log).
  const [syncedRealDay, setSyncedRealDay] = useState(realDay);
  if (realDay !== syncedRealDay) {
    setSyncedRealDay(realDay);
    setSelectedDay(realDay);
  }
  const isToday = selectedDay === realDay;

  const status: CycleStatus = useMemo(() => {
    if (isToday) return realStatus;
    const fw = realStatus.fertileWindow;
    return {
      ...realStatus,
      cycleDay: selectedDay,
      phase: phaseForDay(selectedDay, cycleSettings),
      isFertile: selectedDay >= fw.startDay && selectedDay <= fw.endDay,
      isOvulationPeak: selectedDay === realStatus.ovulationDay,
      isLate: false,
      lateBy: 0,
      progress: selectedDay / n,
      daysUntilNextPeriod: n - selectedDay + 1,
    };
  }, [isToday, selectedDay, realStatus, cycleSettings, n]);

  const meta = PHASES[status.phase];
  const guide = PHASE_GUIDANCE[status.phase];
  const firstName = settings.name.trim().split(/\s+/)[0] || 'você';
  const selectedDate = addDays(lastStart, selectedDay - 1);

  useEffect(() => {
    const hex = PHASE_HEX[status.phase];
    document.documentElement.style.setProperty('--phase', hex.color);
    document.documentElement.style.setProperty('--phase-deep', hex.deep);
  }, [status.phase]);

  // Centre readout
  const hero =
    status.phase === 'menstrual'
      ? { big: String(status.cycleDay), label: 'dia da menstruação' }
      : status.isLate
        ? { big: String(status.lateBy), label: status.lateBy === 1 ? 'dia de atraso' : 'dias de atraso' }
        : {
            big: String(status.daysUntilNextPeriod),
            label: status.daysUntilNextPeriod === 1 ? 'dia até a menstruação' : 'dias até a menstruação',
          };

  const lengths = cycleLengthsFromStarts(cycle.starts);
  const chartData = lengths
    .map((value, i) => ({ label: format(cycle.starts[i]!, 'MMM', { locale: ptBR }), value }))
    .slice(-6);

  return (
    <>
      <header className="flex items-center justify-between">
        <span className="text-display text-xl font-semibold tracking-tight">Cyclo</span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-faint">Olá, {firstName}</span>
      </header>

      {/* Interactive cycle ring */}
      <section className="mt-4 flex flex-col items-center">
        <CycleRing settings={cycleSettings} status={status} size={306} onSelectDay={setSelectedDay}>
          <span className="text-[11.5px] text-muted">
            {isToday ? 'Hoje, ' : ''}
            {format(selectedDate, "d 'de' MMM", { locale: ptBR })}
          </span>
          <span className="text-display mt-1 text-[3.6rem] font-bold leading-[0.9]" style={{ color: meta.color }}>
            {hero.big}
          </span>
          <span className="mt-1 max-w-[150px] text-[12.5px] leading-tight text-ink">{hero.label}</span>
          <span className="mt-2 text-[12px] font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </CycleRing>

        <p className="mt-3 text-center text-[12px] text-faint">
          Arraste pelo círculo para ver outros dias do ciclo
        </p>
        {!isToday ? (
          <button
            onClick={() => setSelectedDay(realDay)}
            className="mt-2 rounded-full border border-hairline px-4 py-1.5 text-[12.5px] font-semibold"
            style={{ color: 'var(--phase)' }}
          >
            Voltar para hoje
          </button>
        ) : null}
      </section>

      {/* Fertile-window warning */}
      {status.isFertile ? (
        <section
          className="mt-6 rounded-3xl p-5"
          style={{
            background: 'color-mix(in srgb, var(--color-ovulatory) 12%, transparent)',
            boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-ovulatory) 45%, transparent)',
          }}
        >
          <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ovulatory)' }}>
            {status.isOvulationPeak ? 'Ovulação — pico da fertilidade' : 'Período fértil'}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
            A chance de engravidar é a mais alta do ciclo nestes dias.{' '}
            <strong>Se engravidar não estiver nos planos, tome cuidado</strong> e use um método
            contraceptivo — as estimativas do app não substituem proteção.
          </p>
        </section>
      ) : null}

      {/* Phase detail — collapsed by default */}
      <div className="mt-4">
        <Collapsible
          title={`Sobre a ${guide.name.toLowerCase()}`}
          meta={guide.dayRange}
          accent={meta.color}
        >
          <p className="text-[13.5px] leading-relaxed text-muted">{guide.whatsHappening}</p>
          <p className="mb-2 mt-4 text-[12px] font-medium uppercase tracking-[0.12em] text-faint">
            O que ajuda
          </p>
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
        </Collapsible>
      </div>

      {/* Possible symptoms — collapsed by default */}
      <div className="mt-3">
        <Collapsible title="Ver possíveis sintomas" meta={`Comuns na ${guide.name.toLowerCase()}`}>
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
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            São padrões comuns nesta fase — não um diagnóstico. Você pode registrar o que sentir na
            aba Registrar.
          </p>
        </Collapsible>
      </div>

      {/* Cycle chart */}
      <section className="glass mt-3 rounded-3xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <DropFilledIcon width={15} height={15} style={{ color: 'var(--color-menstrual)' }} />
          <p className="text-[13px] font-semibold">Duração dos seus ciclos</p>
        </div>
        <BarChart
          data={chartData}
          unit="d"
          accent="var(--phase)"
          emptyLabel="Registre mais uma menstruação para ver seu histórico aqui."
        />
      </section>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        Estimativas baseadas em médias — não são um método contraceptivo nem substituem orientação médica.
      </p>
    </>
  );
}
