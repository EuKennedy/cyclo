import type { PhaseId } from '@/domain/types';

export interface PhaseMeta {
  id: PhaseId;
  /** Short pt-BR clinical name. */
  label: string;
  /** Editorial one-word title for the phase's mood. */
  title: string;
  /** CSS custom property for the phase's primary accent. */
  color: string;
  /** CSS custom property for the deeper glow tone. */
  deep: string;
  /** Short, evocative, validating line (never clinical, never a to-do list). */
  line: string;
}

/**
 * UI metadata for the four phases. Copy is editorial and affirming — a mood, not
 * a prescription (docs/RESEARCH-SPEC.md §3).
 */
export const PHASES: Record<PhaseId, PhaseMeta> = {
  menstrual: {
    id: 'menstrual',
    label: 'Menstrual',
    title: 'Recomeço',
    color: 'var(--color-menstrual)',
    deep: 'var(--color-menstrual-deep)',
    line: 'Seu corpo abre um novo ciclo. Tempo de desacelerar, se aquecer e se ouvir.',
  },
  follicular: {
    id: 'follicular',
    label: 'Folicular',
    title: 'Despertar',
    color: 'var(--color-follicular)',
    deep: 'var(--color-follicular-deep)',
    line: 'A vitalidade volta a subir. Vontade de criar, planejar e se movimentar.',
  },
  ovulatory: {
    id: 'ovulatory',
    label: 'Ovulatória',
    title: 'Plenitude',
    color: 'var(--color-ovulatory)',
    deep: 'var(--color-ovulatory-deep)',
    line: 'Seu ponto mais luminoso. Clareza, presença e energia no auge.',
  },
  luteal: {
    id: 'luteal',
    label: 'Lútea',
    title: 'Introspecção',
    color: 'var(--color-luteal)',
    deep: 'var(--color-luteal-deep)',
    line: 'O ritmo desacelera aos poucos. Um convite a cuidar de si com mais gentileza.',
  },
};

export const phaseMeta = (id: PhaseId): PhaseMeta => PHASES[id];

/** Literal hex values, used to set the animatable `--phase` channel on :root. */
export const PHASE_HEX: Record<PhaseId, { color: string; deep: string }> = {
  menstrual: { color: '#db5a73', deep: '#9e3a50' },
  follicular: { color: '#e79a6a', deep: '#b3683c' },
  ovulatory: { color: '#f2c879', deep: '#c79a46' },
  luteal: { color: '#a98fd0', deep: '#74539f' },
};
