import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCycleStatus } from '@/domain/cycle';
import type { ConfidenceTier, CycleStatus } from '@/domain/types';
import { PHASES, PHASE_HEX } from '@/lib/phases';

const CONFIDENCE_LABEL: Record<ConfidenceTier, string> = {
  'very-high': 'Ótima',
  high: 'Alta',
  moderate: 'Média',
  low: 'Baixa',
  irregular: 'Irregular',
  insufficient: '—',
};
import type { SettingsRecord } from '@/lib/db';
import type { CycleState } from '@/lib/useCycle';
import { CycleRing } from '@/components/CycleRing';

export function HomeScreen({ settings, cycle }: { settings: SettingsRecord; cycle: CycleState }) {
  const { cycleSettings, status: realStatus, lastStart, today } = cycle;

  const realDay = Math.min(realStatus.cycleDay, cycleSettings.avgCycleLength);
  const [previewDay, setPreviewDay] = useState(realDay);
  useEffect(() => setPreviewDay(realDay), [realDay]);
  const exploring = previewDay !== realDay;

  const status: CycleStatus = useMemo(() => {
    if (!exploring) return realStatus;
    return getCycleStatus(subDays(today, previewDay - 1), cycleSettings, today);
  }, [exploring, previewDay, today, cycleSettings, realStatus]);

  const meta = PHASES[status.phase];
  const firstName = settings.name.trim().split(/\s+/)[0] || 'você';

  useEffect(() => {
    const hex = PHASE_HEX[status.phase];
    document.documentElement.style.setProperty('--phase', hex.color);
    document.documentElement.style.setProperty('--phase-deep', hex.deep);
  }, [status.phase]);

  const fertileStart = addDays(lastStart, realStatus.fertileWindow.startDay - 1);
  const fertileEnd = addDays(lastStart, realStatus.fertileWindow.endDay - 1);

  return (
    <>
      <header>
        <div className="flex items-center justify-between">
          <span className="text-display text-xl font-semibold tracking-tight">Cyclo</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-faint">
            {format(today, "EEE, d 'de' MMM", { locale: ptBR })}
          </span>
        </div>
        <h1 className="text-display mt-4 text-[1.6rem] font-semibold leading-tight">Olá, {firstName}</h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          {realStatus.isLate
            ? `Sua menstruação está ${realStatus.lateBy} ${realStatus.lateBy === 1 ? 'dia' : 'dias'} atrasada.`
            : `Você está no dia ${realStatus.cycleDay} do seu ciclo.`}
        </p>
      </header>

      <section className="mt-6 flex flex-col items-center">
        <CycleRing settings={cycleSettings} status={status} size={318}>
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted">Dia</span>
          <motion.span
            key={status.cycleDay}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-display text-[5.4rem] font-semibold leading-[0.9]"
          >
            {status.cycleDay}
          </motion.span>
          <span className="mt-1 text-sm text-muted">
            {meta.label}
            {exploring ? ' · prévia' : ''}
          </span>
        </CycleRing>

        <div className="mt-8 min-h-[112px] max-w-sm text-center">
          <motion.div
            key={status.phase}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-display text-[1.7rem] leading-tight">{meta.title}</h2>
            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted">{meta.line}</p>
          </motion.div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-faint">
          <span>Explorar o ciclo</span>
          {exploring ? (
            <button
              onClick={() => setPreviewDay(realDay)}
              className="rounded-full px-2 py-0.5 font-semibold"
              style={{ color: 'var(--phase)' }}
            >
              Voltar para hoje
            </button>
          ) : (
            <span>Dia {realDay} · hoje</span>
          )}
        </div>
        <input
          type="range"
          className="scrubber"
          min={1}
          max={cycleSettings.avgCycleLength}
          value={previewDay}
          aria-label="Explorar o dia do ciclo"
          onChange={(e) => setPreviewDay(Number(e.target.value))}
        />
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <InfoCard
          label="Próxima menstruação"
          value={
            realStatus.daysUntilNextPeriod > 0
              ? `em ${realStatus.daysUntilNextPeriod} ${realStatus.daysUntilNextPeriod === 1 ? 'dia' : 'dias'}`
              : realStatus.isLate
                ? `${realStatus.lateBy} ${realStatus.lateBy === 1 ? 'dia' : 'dias'} de atraso`
                : 'hoje'
          }
          sub={format(realStatus.nextPredictedStart, "d 'de' MMMM", { locale: ptBR })}
        />
        <InfoCard
          label="Janela fértil"
          value={`dias ${realStatus.fertileWindow.startDay}–${realStatus.fertileWindow.endDay}`}
          sub={`${format(fertileStart, "d 'de' MMM", { locale: ptBR })} – ${format(fertileEnd, "d 'de' MMM", { locale: ptBR })}`}
        />
      </section>

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
            Registre mais ciclos e as previsões ficam cada vez mais suas.
          </p>
        ) : null}
      </section>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        Estimativas baseadas em médias — não são um método contraceptivo nem substituem orientação médica.
      </p>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-display text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-faint">{label}</p>
    </div>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass rounded-[22px] p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="text-display mt-1.5 text-lg capitalize leading-tight">{value}</p>
      <p className="mt-0.5 text-[12px] text-muted">{sub}</p>
    </div>
  );
}
