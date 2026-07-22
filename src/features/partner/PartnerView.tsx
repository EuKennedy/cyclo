import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCycleStatus } from '@/domain/cycle';
import type { CycleSettings, CycleStatus } from '@/domain/types';
import { PHASES, PHASE_HEX } from '@/lib/phases';
import { PARTNER_SUPPORT, PHASE_GUIDANCE } from '@/lib/phaseGuidance';
import { fetchPartnerShare, type SharePayload } from '@/lib/partnerShare';
import { AuroraBackground } from '@/components/AuroraBackground';
import { CycleRing } from '@/components/CycleRing';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; payload: SharePayload; settings: CycleSettings; status: CycleStatus };

export function PartnerView({ token, shareKey }: { token: string; shareKey: string | null }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shareKey) {
        setState({
          kind: 'error',
          message: 'Este link está incompleto. Peça para ela enviar o link inteiro novamente.',
        });
        return;
      }
      try {
        const payload = await fetchPartnerShare(token, shareKey);
        if (cancelled) return;
        const settings: CycleSettings = {
          avgCycleLength: payload.avgCycleLength,
          avgPeriodLength: payload.avgPeriodLength,
          lutealLength: payload.lutealLength,
        };
        const status = getCycleStatus(parseISO(payload.lastPeriodStart), settings, startOfDay(new Date()));
        setState({ kind: 'ready', payload, settings, status });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Não foi possível abrir este link.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, shareKey]);

  useEffect(() => {
    if (state.kind !== 'ready') return;
    const hex = PHASE_HEX[state.status.phase];
    document.documentElement.style.setProperty('--phase', hex.color);
    document.documentElement.style.setProperty('--phase-deep', hex.deep);
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-void">
        <span className="text-display animate-pulse text-2xl font-semibold text-muted">Cyclo</span>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <AuroraBackground />
        <span className="text-display text-2xl font-semibold tracking-tight">Cyclo</span>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{state.message}</p>
        <p className="mt-6 max-w-sm text-[12px] leading-relaxed text-faint">
          Links compartilhados expiram e podem ser revogados a qualquer momento por quem os criou.
        </p>
      </div>
    );
  }

  const { payload, settings, status } = state;
  const meta = PHASES[status.phase];
  const guide = PHASE_GUIDANCE[status.phase];
  const support = PARTNER_SUPPORT[status.phase];
  const name = payload.name || 'ela';

  const countdown =
    status.phase === 'menstrual'
      ? { big: String(status.cycleDay), label: 'dia da menstruação' }
      : status.isLate
        ? { big: String(status.lateBy), label: status.lateBy === 1 ? 'dia de atraso' : 'dias de atraso' }
        : {
            big: String(status.daysUntilNextPeriod),
            label: status.daysUntilNextPeriod === 1 ? 'dia até a menstruação' : 'dias até a menstruação',
          };

  return (
    <div className="relative min-h-dvh w-full">
      <AuroraBackground />
      <div className="mx-auto max-w-md px-6 pb-16 pt-8">
        <header className="flex items-center justify-between">
          <span className="text-display text-xl font-semibold tracking-tight">Cyclo</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-faint">Só leitura</span>
        </header>

        <h1 className="text-display mt-5 text-[1.5rem] font-semibold leading-tight">
          O ciclo de {name}
        </h1>
        <p className="mt-1 text-[0.9rem] text-muted">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>

        <section className="mt-5 flex flex-col items-center">
          <CycleRing settings={settings} status={status} size={280}>
            <span className="text-display text-[3.4rem] font-bold leading-[0.9]" style={{ color: meta.color }}>
              {countdown.big}
            </span>
            <span className="mt-1 max-w-[140px] text-[12.5px] leading-tight text-ink">
              {countdown.label}
            </span>
            <span className="mt-2 text-[12px] font-medium" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </CycleRing>
        </section>

        {status.isFertile ? (
          <section
            className="mt-6 rounded-3xl p-5"
            style={{
              background: 'color-mix(in srgb, var(--color-ovulatory) 12%, transparent)',
              boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-ovulatory) 45%, transparent)',
            }}
          >
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ovulatory)' }}>
              Período fértil
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
              É a fase de maior chance de gravidez.{' '}
              <strong>Se engravidar não estiver nos planos de vocês, usem proteção</strong> — as
              estimativas do app não substituem um método contraceptivo.
            </p>
          </section>
        ) : null}

        <section className="glass mt-4 rounded-3xl p-5">
          <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Como apoiar agora</p>
          <ul className="mt-3 space-y-2">
            {support.map((s) => (
              <li key={s} className="flex gap-2 text-[13.5px] leading-snug text-muted">
                <span style={{ color: meta.color }}>•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass mt-4 rounded-3xl p-5">
          <p className="text-[12px] uppercase tracking-[0.14em] text-faint">O que está acontecendo</p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{guide.whatsHappening}</p>
        </section>

        <footer className="mt-8 space-y-2 text-center">
          <p className="text-[12px] leading-relaxed text-faint">
            Você está vendo apenas um resumo do ciclo. Sintomas, humor e anotações pessoais não são
            compartilhados.
          </p>
          <p className="text-[11px] leading-relaxed text-faint/70">
            Este link expira e pode ser revogado por {name} a qualquer momento.
          </p>
        </footer>
      </div>
    </div>
  );
}
