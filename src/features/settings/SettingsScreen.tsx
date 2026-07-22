import { NumberStepper } from '@/components/ui';
import { purgeAll, updateSettings } from '@/lib/settings';
import type { SettingsRecord } from '@/lib/db';
import { SyncSection } from './SyncSection';

export function SettingsScreen({ settings }: { settings: SettingsRecord }) {
  const handleReset = async () => {
    if (
      window.confirm(
        'Isto apaga TODOS os seus dados deste dispositivo, de forma permanente e irreversível. Continuar?',
      )
    ) {
      await purgeAll();
    }
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="text-display text-[1.6rem] font-semibold leading-tight">Você</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Seu perfil e as configurações do ciclo.</p>
      </header>

      <section className="glass rounded-3xl p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Perfil</p>
        <div className="mt-3 space-y-3">
          <Row label="Nome" value={settings.name || '—'} />
          <Row label="E-mail" value={settings.email || '—'} />
          <Row label="Telefone" value={settings.phone || '—'} />
        </div>
      </section>

      <section className="glass mt-4 rounded-3xl p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Seu ciclo</p>
        <div className="mt-4 space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">Duração média do ciclo</p>
            <NumberStepper
              value={settings.avgCycleLength}
              onChange={(v) => updateSettings({ avgCycleLength: v })}
              min={21}
              max={45}
              suffix="dias"
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">Duração da menstruação</p>
            <NumberStepper
              value={settings.avgPeriodLength}
              onChange={(v) => updateSettings({ avgPeriodLength: v })}
              min={2}
              max={10}
              suffix="dias"
            />
          </div>
        </div>
      </section>

      <SyncSection />

      <section className="glass mt-4 rounded-3xl p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Privacidade</p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          🔒 Todos os seus dados ficam guardados apenas neste dispositivo. Nada é enviado para nenhum
          servidor.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-4 flex h-[48px] w-full items-center justify-center rounded-2xl border text-[14px] font-semibold transition active:scale-[0.98]"
          style={{ borderColor: 'color-mix(in srgb, var(--color-menstrual) 45%, transparent)', color: 'var(--color-menstrual)' }}
        >
          Apagar todos os meus dados
        </button>
      </section>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        Cyclo · seus dados, seu corpo, seu ritmo.
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="truncate text-[14px] font-medium">{value}</span>
    </div>
  );
}
