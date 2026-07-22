import { useMemo } from 'react';
import { differenceInCalendarDays, format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cycleLengthsFromStarts } from '@/domain/predictions';
import type { ConfidenceTier } from '@/domain/types';
import { usePeriodLogs } from '@/lib/periods';
import type { SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { BarChart, Metric } from '@/components/charts';
import { DropFilledIcon } from '@/components/icons';

const CONFIDENCE_LABEL: Record<ConfidenceTier, string> = {
  'very-high': 'Ótima',
  high: 'Alta',
  moderate: 'Média',
  low: 'Baixa',
  irregular: 'Irregular',
  insufficient: '—',
};

interface PeriodRun {
  start: string;
  days: number;
}

/** Group logged bleeding days into runs (one per menstruation). */
function periodRuns(dates: readonly string[]): PeriodRun[] {
  const sorted = [...new Set(dates)].sort();
  const runs: PeriodRun[] = [];
  let prev: Date | null = null;
  for (const d of sorted) {
    const cur = parseISO(d);
    const last = runs[runs.length - 1];
    if (!prev || !last || differenceInCalendarDays(cur, prev) > 1) runs.push({ start: d, days: 1 });
    else last.days += 1;
    prev = cur;
  }
  return runs;
}

export function AnalysisScreen({ cycle }: { settings: SettingsRecord; cycle: CycleState }) {
  const { cycleSettings, estimate, starts, today } = cycle;
  const logs = usePeriodLogs();
  const runs = useMemo(() => periodRuns((logs ?? []).map((l) => l.date)), [logs]);

  const lengths = cycleLengthsFromStarts(starts);
  const cycleChart = lengths
    .map((value, i) => ({ label: format(starts[i]!, 'MMM', { locale: ptBR }), value }))
    .slice(-6);

  const periodChart = runs
    .map((r) => ({ label: format(parseISO(r.start), 'MMM', { locale: ptBR }), value: r.days }))
    .slice(-6);

  const avgCycle = estimate.usedFallback ? cycleSettings.avgCycleLength : Math.round(estimate.avg);
  const avgPeriod = runs.length
    ? Math.round((runs.reduce((a, r) => a + r.days, 0) / runs.length) * 10) / 10
    : cycleSettings.avgPeriodLength;

  const threeMonthsAgo = subMonths(today, 3);
  const recent = useMemo(
    () =>
      runs
        .filter((r) => parseISO(r.start) >= threeMonthsAgo)
        .sort((a, b) => (a.start < b.start ? 1 : -1)),
    [runs, threeMonthsAgo],
  );

  const cycleLengthFor = (startISO: string): number | null => {
    const i = starts.findIndex((s) => format(s, 'yyyy-MM-dd') === startISO);
    return i >= 0 && i < lengths.length ? (lengths[i] ?? null) : null;
  };

  return (
    <>
      <header className="mb-5">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Análise</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Como o seu ciclo vem se comportando.</p>
      </header>

      <section className="glass grid grid-cols-2 gap-y-5 rounded-3xl p-5">
        <Metric value={String(starts.length)} label={starts.length === 1 ? 'ciclo registrado' : 'ciclos registrados'} />
        <Metric value={`${avgCycle}d`} label="ciclo médio" />
        <Metric value={`${avgPeriod}d`} label="menstruação média" />
        <Metric
          value={CONFIDENCE_LABEL[estimate.confidence]}
          label="regularidade"
          hint={estimate.irregular ? 'variação alta' : undefined}
        />
      </section>

      <section className="glass mt-4 rounded-3xl p-5">
        <p className="mb-3 text-[13px] font-semibold">Duração dos ciclos</p>
        <BarChart
          data={cycleChart}
          unit="d"
          accent="var(--color-luteal)"
          emptyLabel="Registre pelo menos duas menstruações para comparar seus ciclos."
        />
        {cycleChart.length >= 2 ? (
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            Variação de {Math.min(...cycleChart.map((d) => d.value))} a{' '}
            {Math.max(...cycleChart.map((d) => d.value))} dias.
            {estimate.irregular
              ? ' Uma variação acima de 9 dias é considerada irregular — vale conversar com um ginecologista.'
              : ' Isso está dentro de uma variação esperada.'}
          </p>
        ) : null}
      </section>

      <section className="glass mt-4 rounded-3xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <DropFilledIcon width={15} height={15} style={{ color: 'var(--color-menstrual)' }} />
          <p className="text-[13px] font-semibold">Dias de menstruação</p>
        </div>
        <BarChart
          data={periodChart}
          unit="d"
          accent="var(--color-menstrual)"
          emptyLabel="Registre sua menstruação no calendário para ver este gráfico."
        />
      </section>

      <section className="glass mt-4 rounded-3xl p-5">
        <p className="mb-3 text-[13px] font-semibold">Últimos 3 meses</p>
        {recent.length === 0 ? (
          <p className="py-3 text-[13px] text-faint">Nenhuma menstruação registrada neste período.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {recent.map((r) => {
              const len = cycleLengthFor(r.start);
              return (
                <li key={r.start} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[14px] font-medium capitalize">
                      {format(parseISO(r.start), "d 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="mt-0.5 text-[12px] text-faint">
                      {r.days} {r.days === 1 ? 'dia de fluxo' : 'dias de fluxo'}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[12px] font-semibold"
                    style={{
                      color: len ? 'var(--color-luteal)' : 'var(--color-faint)',
                      background: len ? 'color-mix(in srgb, var(--color-luteal) 14%, transparent)' : 'transparent',
                    }}
                  >
                    {len ? `ciclo de ${len}d` : 'ciclo atual'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        Estes números são do seu histórico registrado e ficam mais precisos a cada ciclo.
      </p>
    </>
  );
}
