/** pt-BR options for the daily log. */
export const MOODS = [
  'Feliz',
  'Calma',
  'Animada',
  'Sensível',
  'Irritada',
  'Ansiosa',
  'Triste',
  'Cansada',
] as const;

export const SYMPTOMS = [
  'Cólica',
  'Dor de cabeça',
  'Inchaço',
  'Seios sensíveis',
  'Acne',
  'Desejo por doce',
  'Insônia',
  'Fadiga',
  'Náusea',
] as const;

export const ENERGY_LABELS: Record<number, string> = {
  1: 'Muito baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Muito alta',
};
