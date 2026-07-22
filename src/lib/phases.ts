import type { PhaseId } from '@/domain/types';

export interface PhaseMeta {
  id: PhaseId;
  /** Clinical phase name (pt-BR). */
  label: string;
  color: string;
  deep: string;
}

export const PHASES: Record<PhaseId, PhaseMeta> = {
  menstrual: {
    id: 'menstrual',
    label: 'Menstruação',
    color: 'var(--color-menstrual)',
    deep: 'var(--color-menstrual-deep)',
  },
  follicular: {
    id: 'follicular',
    label: 'Fase folicular',
    color: 'var(--color-follicular)',
    deep: 'var(--color-follicular-deep)',
  },
  ovulatory: {
    id: 'ovulatory',
    label: 'Ovulação',
    color: 'var(--color-ovulatory)',
    deep: 'var(--color-ovulatory-deep)',
  },
  luteal: {
    id: 'luteal',
    label: 'Fase lútea',
    color: 'var(--color-luteal)',
    deep: 'var(--color-luteal-deep)',
  },
};

export const phaseMeta = (id: PhaseId): PhaseMeta => PHASES[id];

/** Literal hex values, used to set the animatable `--phase` channel on :root. */
export const PHASE_HEX: Record<PhaseId, { color: string; deep: string }> = {
  menstrual: { color: '#e5484d', deep: '#9b1c21' },
  follicular: { color: '#e79a6a', deep: '#b3683c' },
  ovulatory: { color: '#f2c879', deep: '#c79a46' },
  luteal: { color: '#a98fd0', deep: '#74539f' },
};
