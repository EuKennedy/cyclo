import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Calendar } from '@/components/Calendar';
import { Button, ChoiceGroup, NumberStepper, TextField, type Choice } from '@/components/ui';
import { PHASE_HEX } from '@/lib/phases';
import { saveOnboarding } from '@/lib/settings';
import type { CycleGoal } from '@/lib/db';
import type { PhaseId } from '@/domain/types';

const GOALS: ReadonlyArray<Choice<CycleGoal>> = [
  { value: 'track', label: 'Acompanhar meu ciclo', description: 'Entender meu corpo e prever a menstruação.' },
  { value: 'understand', label: 'Entender meus sintomas', description: 'Conectar humor e energia às fases.' },
  { value: 'conceive', label: 'Tentar engravidar', description: 'Acompanhar a janela fértil de perto.' },
];

// Each step subtly previews a different accent from the palette.
const STEP_ACCENT: PhaseId[] = ['menstrual', 'follicular', 'ovulatory', 'luteal', 'menstrual'];
const TOTAL = 5;
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [avgPeriodLength, setAvgPeriodLength] = useState(5);
  const [goal, setGoal] = useState<CycleGoal>('track');
  const [lastPeriod, setLastPeriod] = useState<Date | null>(null);

  useEffect(() => {
    const accent = STEP_ACCENT[step] ?? 'luteal';
    const hex = PHASE_HEX[accent];
    document.documentElement.style.setProperty('--phase', hex.color);
    document.documentElement.style.setProperty('--phase-deep', hex.deep);
  }, [step]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return name.trim().length >= 2;
      case 1:
        return emailOk(email) && phone.trim().length >= 8;
      case 2:
        return true;
      case 3:
        return lastPeriod != null;
      default:
        return true;
    }
  }, [step, name, email, phone, lastPeriod]);

  const go = (delta: number) => {
    if (delta > 0 && !canAdvance) {
      setTouched(true);
      return;
    }
    setTouched(false);
    setStep((s) => Math.min(Math.max(s + delta, 0), TOTAL - 1));
  };

  const finish = async () => {
    if (!lastPeriod) return;
    setSubmitting(true);
    await saveOnboarding({
      name,
      email,
      phone,
      lastPeriodStart: format(lastPeriod, 'yyyy-MM-dd'),
      avgCycleLength,
      avgPeriodLength,
      lifeStage: 'adult',
      goal,
    });
    // The live settings query flips the app to Home automatically.
  };

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center px-6 py-8">
      <AuroraBackground />

      {/* Progress */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <span className="text-display text-lg font-semibold tracking-tight">Cyclo</span>
          <span className="text-[12px] text-faint">
            Passo {step + 1} de {TOTAL}
          </span>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--phase)' }}
            initial={false}
            animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex w-full max-w-md flex-1 flex-col justify-center py-6">
        <motion.div
          key={step}
          initial={{ x: 28, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            {step === 0 && (
              <Step
                eyebrow="Bem-vinda ao Cyclo"
                title="Vamos começar por você"
                subtitle="Um espaço privado para entender o seu ciclo. Como podemos te chamar?"
              >
                <TextField
                  label="Seu nome"
                  placeholder="Como prefere ser chamada"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  error={touched && name.trim().length < 2 ? 'Conte-nos seu nome.' : undefined}
                />
              </Step>
            )}

            {step === 1 && (
              <Step
                eyebrow={`Prazer, ${name.trim() || 'você'}`}
                title="Seus dados de contato"
                subtitle="Para personalizar sua experiência e, se quiser, recuperar seus dados depois."
              >
                <div className="grid gap-4">
                  <TextField
                    label="E-mail"
                    type="email"
                    inputMode="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={touched && !emailOk(email) ? 'Digite um e-mail válido.' : undefined}
                  />
                  <TextField
                    label="Telefone de contato"
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={touched && phone.trim().length < 8 ? 'Digite um telefone válido.' : undefined}
                  />
                  <p className="text-[12px] leading-relaxed text-faint">
                    🔒 Estes dados ficam guardados <strong className="text-muted">só neste dispositivo</strong>.
                    Nada é enviado para nenhum servidor.
                  </p>
                </div>
              </Step>
            )}

            {step === 2 && (
              <Step
                eyebrow="Sobre o seu ciclo"
                title="Como o seu ciclo costuma ser?"
                subtitle="Não precisa ser exato — vamos refinar com o tempo, conforme você registra."
              >
                <div className="grid gap-5">
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-muted">Duração média do ciclo</p>
                    <NumberStepper value={avgCycleLength} onChange={setAvgCycleLength} min={21} max={45} suffix="dias" />
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-muted">Duração da menstruação</p>
                    <NumberStepper value={avgPeriodLength} onChange={setAvgPeriodLength} min={2} max={10} suffix="dias" />
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-muted">Seu objetivo</p>
                    <ChoiceGroup value={goal} onChange={setGoal} options={GOALS} />
                  </div>
                </div>
              </Step>
            )}

            {step === 3 && (
              <Step
                eyebrow="Seu calendário"
                title="Quando começou sua última menstruação?"
                subtitle="Toque no primeiro dia. É a partir dele que o Cyclo entende onde você está agora."
              >
                <Calendar selected={lastPeriod} onSelect={setLastPeriod} />
                {lastPeriod ? (
                  <p className="mt-3 text-center text-[13px] text-muted">
                    Selecionado:{' '}
                    <span className="font-semibold text-ink">
                      {format(lastPeriod, "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </p>
                ) : null}
              </Step>
            )}

            {step === 4 && (
              <Step
                eyebrow="Tudo pronto"
                title={`Seu ciclo te espera, ${name.trim() || 'bem-vinda'}`}
                subtitle="Criamos um espaço só seu. Você pode ajustar tudo depois, quando quiser."
              >
                <div className="glass grid gap-3 rounded-3xl p-5">
                  <SummaryRow label="Ciclo médio" value={`${avgCycleLength} dias`} />
                  <SummaryRow label="Menstruação" value={`${avgPeriodLength} dias`} />
                  <SummaryRow
                    label="Última menstruação"
                    value={lastPeriod ? format(lastPeriod, "d 'de' MMM", { locale: ptBR }) : '—'}
                  />
                  <SummaryRow label="Objetivo" value={GOALS.find((g) => g.value === goal)?.label ?? ''} />
                </div>
              </Step>
            )}
        </motion.div>
      </div>

      {/* Nav */}
      <div className="flex w-full max-w-md items-center gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => go(-1)} disabled={submitting}>
            Voltar
          </Button>
        ) : (
          <span />
        )}
        <div className="flex-1" />
        {step < TOTAL - 1 ? (
          <Button onClick={() => go(1)} disabled={!canAdvance} className="min-w-[160px]">
            Continuar
          </Button>
        ) : (
          <Button onClick={finish} disabled={submitting} className="min-w-[180px]">
            {submitting ? 'Entrando…' : 'Entrar no Cyclo'}
          </Button>
        )}
      </div>
    </main>
  );
}

function Step({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--phase)' }}>
        {eyebrow}
      </p>
      <h1 className="text-display mt-2.5 text-[1.9rem] font-semibold leading-[1.1]">{title}</h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[14px] font-semibold">{value}</span>
    </div>
  );
}
