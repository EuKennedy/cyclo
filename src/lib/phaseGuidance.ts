import type { PhaseId } from '@/domain/types';

export interface PhaseGuidance {
  /** Clinical name. */
  name: string;
  dayRange: string;
  /** What is physiologically happening — objective, medical. */
  whatsHappening: string;
  /** Common, real symptoms of the phase. */
  symptoms: string[];
  /** Concrete, evidence-based actions to feel better. */
  tips: string[];
  /** Only for the ovulatory phase. */
  fertilityNote?: string;
}

/**
 * Serious, clinical guidance per phase — what happens, what she may feel, and
 * what she can do. No mysticism. Content produced and medically verified by a
 * multi-agent workflow grounded in ACOG / Mayo Clinic / Cleveland Clinic.
 */
export const PHASE_GUIDANCE: Record<PhaseId, PhaseGuidance> = {
  menstrual: {
    name: 'Fase menstrual (menstruação)',
    dayRange: 'Dias 1–5',
    whatsHappening:
      'A queda acentuada de estrogênio e progesterona ao fim do ciclo anterior faz o endométrio (revestimento uterino) se desprender e ser eliminado. O primeiro dia de sangramento marca o início do ciclo. As contrações uterinas que expelem esse tecido são mediadas por prostaglandinas e são a principal causa das cólicas.',
    symptoms: [
      'Cólicas abdominais ou pélvicas (dismenorreia)',
      'Sangramento de leve a moderado, podendo ter pequenos coágulos',
      'Dor lombar (parte baixa das costas)',
      'Fadiga e queda de disposição',
      'Dor de cabeça ou enxaqueca menstrual',
      'Sensibilidade ou dor nas mamas',
      'Inchaço, alterações intestinais e irritabilidade',
    ],
    tips: [
      'Aplique calor local (bolsa térmica) no baixo-ventre ou na lombar para relaxar a musculatura e aliviar as cólicas',
      'Anti-inflamatórios (ibuprofeno ou naproxeno) logo no início da dor reduzem as prostaglandinas — use conforme orientação médica',
      'Mantenha boa hidratação e reduza sal, cafeína e álcool para diminuir o inchaço',
      'Faça atividade física leve, como caminhada, alongamento ou ioga, que ajuda a reduzir as cólicas',
      'Priorize sono de qualidade e descanso, respeitando a maior fadiga desta fase',
      'Troque o absorvente, tampão ou coletor a cada 4–8 horas para manter a higiene',
      'Procure um médico se o sangramento for muito intenso (troca a cada 1–2h), durar mais de 7 dias, ou se a dor for incapacitante',
    ],
  },
  follicular: {
    name: 'Fase folicular',
    dayRange: 'Dias 6–13 (após a menstruação, até a ovulação)',
    whatsHappening:
      'O hormônio folículo-estimulante (FSH) estimula o amadurecimento de um novo folículo no ovário, que passa a produzir estrogênio em quantidade crescente. Esse estrogênio reconstrói e espessa o endométrio. Com a elevação do estrogênio, a energia e a disposição tendem a melhorar gradualmente.',
    symptoms: [
      'Aumento gradual da energia e da disposição',
      'Humor tende a ficar mais estável',
      'Possível melhora na concentração',
      'Aumento gradual da libido',
      'Pele tende a ficar menos oleosa',
      'Muco cervical mais transparente e elástico no fim da fase',
      'Menos cólicas e menor sensibilidade nas mamas',
    ],
    tips: [
      'Aproveite a maior disposição para treinos de força e exercícios mais intensos — a recuperação costuma ser mais rápida',
      'Reponha o ferro após o sangramento com carnes magras, feijão e folhas verde-escuras',
      'Mantenha alimentação equilibrada, com boa oferta de proteínas e alimentos integrais',
      'Bom momento para planejar e iniciar tarefas mais exigentes',
      'Mantenha sono regular e boa hidratação para sustentar a disposição',
      'Observe o muco cervical: quando fica transparente e elástico, sinaliza a aproximação da ovulação',
      'Se não deseja engravidar, use um método contraceptivo confiável — a fertilidade começa a subir no fim desta fase',
    ],
  },
  ovulatory: {
    name: 'Fase ovulatória',
    dayRange: 'Dias 12–16',
    whatsHappening:
      'Um pico do hormônio luteinizante (LH), desencadeado pelos níveis altos de estrogênio, provoca a liberação do óvulo maduro pelo ovário. O óvulo permanece viável por cerca de 12 a 24 horas, enquanto os espermatozoides podem sobreviver até 5 dias no trato reprodutivo.',
    symptoms: [
      'Muco cervical transparente e elástico, como clara de ovo',
      'Dor pélvica leve de um lado do baixo-ventre (Mittelschmerz)',
      'Aumento discreto da libido',
      'Sensibilidade ou leve dor nas mamas',
      'Pequeno aumento da temperatura basal após a ovulação (~0,3–0,5 °C)',
      'Distensão abdominal leve',
      'Eventual sangramento discreto (spotting) no meio do ciclo',
    ],
    tips: [
      'Acompanhe o muco cervical e a temperatura basal por alguns ciclos para reconhecer seu padrão de ovulação',
      'Se o objetivo é engravidar, mantenha relações a cada 1–2 dias durante a janela fértil',
      'Testes de ovulação de urina detectam o pico de LH e ajudam a confirmar o período mais fértil',
      'Para o desconforto do Mittelschmerz, use um analgésico simples ou uma compressa morna no baixo-ventre',
      'Mantenha hidratação, alimentação equilibrada e atividade física regular',
      'Se não deseja engravidar, use contracepção confiável — este é o período de maior fertilidade',
      'Procure um médico se a dor pélvica for intensa, súbita ou persistente, ou se houver sangramento fora do habitual',
    ],
    fertilityNote:
      'A janela fértil vai, aproximadamente, dos 5 dias que antecedem a ovulação até o dia da ovulação (~6 dias), por causa da sobrevivência dos espermatozoides. É o período de maior chance de gravidez. IMPORTANTE: previsões por calendário, temperatura ou muco são apenas estimativas e NÃO constituem método contraceptivo confiável — o dia da ovulação varia entre ciclos. Para evitar a gravidez, use um método adequado e converse com seu médico.',
  },
  luteal: {
    name: 'Fase lútea (pré-menstrual / TPM)',
    dayRange: 'Dias 15–28 (costuma durar de 11 a 14 dias)',
    whatsHappening:
      'Após a ovulação, o folículo rompido se transforma em corpo lúteo e passa a produzir progesterona. Esse hormônio prepara o endométrio para uma possível gravidez. Sem fecundação, o corpo lúteo regride e a queda de progesterona e estrogênio desencadeia a menstruação — é nos dias finais que costumam surgir os sintomas de TPM.',
    symptoms: [
      'Sensibilidade, dor ou inchaço nas mamas (mastalgia)',
      'Inchaço abdominal e retenção de líquidos',
      'Irritabilidade, ansiedade, tristeza ou choro fácil',
      'Cansaço, queda de energia e dificuldade de concentração',
      'Aumento do apetite e desejo por doces ou carboidratos',
      'Dor de cabeça e cólicas leves no baixo-ventre',
      'Acne, pele mais oleosa e alterações do sono',
    ],
    tips: [
      'Faça atividade aeróbica regular (~30 min na maioria dos dias) — reduz inchaço, fadiga e sintomas de humor',
      'Reduza sal, cafeína, álcool e açúcar nas semanas pré-menstruais para diminuir retenção e irritabilidade',
      'Prefira refeições menores e frequentes, com carboidratos complexos, fibras e proteína, para estabilizar o humor',
      'Garanta cálcio adequado (~1.000–1.200 mg/dia) e vitamina D, associados à redução dos sintomas de TPM',
      'Mantenha sono regular de 7 a 9 horas e boa higiene do sono',
      'Use técnicas de manejo do estresse: respiração, mindfulness ou ioga',
      'Para cólicas e dor nas mamas, os anti-inflamatórios ajudam; procure um ginecologista se os sintomas forem incapacitantes ou sugerirem TDPM',
    ],
  },
};
