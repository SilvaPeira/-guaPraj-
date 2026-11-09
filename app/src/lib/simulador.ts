// Regras do simulador — seção 4 do documento "ÁguaPrajá — Análise da ideia de negócio".
// Ajuste os números aqui; a página usa só estas funções.

export const LITROS_DIA = {
  adulto: 2.5,
  crianca: 1.3, // até 13 anos
  bebe: 0.7, // 0–1 ano
  adolescente: 2.0, // 14–17
  idoso: 2.0, // 60+
} as const;

export const FATOR_CALOR = 1.2; // +20% sobre a água de beber
export const LITROS_COZINHA_POR_PESSOA = 0.5;
export const LITROS_GALAO = 20;
export const SEMANAS_POR_MES = 4.3;

/** Planos padrão sugeridos (a loja pode criar outros no app). */
export const PLANOS_PADRAO = [8, 12, 16, 20, 24, 32];

/** Preço de referência do galão avulso em Canaã — HIPÓTESE a confirmar em campo. */
export const PRECO_GALAO_AVULSO = 15;
/** Desconto de referência do plano sobre o avulso (doc sugere 5% a 15%). */
export const DESCONTO_PLANO = 0.1;

export type Moradores = {
  adultos: number;
  criancas: number;
  bebes: number;
  adolescentes: number;
  idosos: number;
};

export type Opcoes = {
  calor: boolean;
  cozinha: boolean;
};

export type Resultado = {
  moradores: number;
  litrosDia: number;
  litrosSemana: number;
  galoesMes: number;
  galoesSemanaMin: number;
  galoesSemanaMax: number;
  planoSugerido: number;
  /** Galões que passam do maior plano padrão (compra extra). */
  excedente: number;
  precoPlanoEstimado: number;
};

export function totalMoradores(m: Moradores): number {
  return m.adultos + m.criancas + m.bebes + m.adolescentes + m.idosos;
}

export function simular(m: Moradores, o: Opcoes): Resultado | null {
  const moradores = totalMoradores(m);
  if (moradores <= 0) return null;

  const beber =
    m.adultos * LITROS_DIA.adulto +
    m.criancas * LITROS_DIA.crianca +
    m.bebes * LITROS_DIA.bebe +
    m.adolescentes * LITROS_DIA.adolescente +
    m.idosos * LITROS_DIA.idoso;

  const litrosDia =
    beber * (o.calor ? FATOR_CALOR : 1) +
    (o.cozinha ? moradores * LITROS_COZINHA_POR_PESSOA : 0);

  // pequena tolerância para evitar 16.0000001 virar 17
  const galoesMes = Math.ceil((litrosDia * 30) / LITROS_GALAO - 1e-9);
  const porSemana = galoesMes / SEMANAS_POR_MES;
  let galoesSemanaMin = Math.floor(porSemana);
  let galoesSemanaMax = Math.ceil(porSemana);
  // se está muito perto de um inteiro, mostra um número só
  if (porSemana - galoesSemanaMin < 0.15) galoesSemanaMax = galoesSemanaMin;
  else if (galoesSemanaMax - porSemana < 0.15) galoesSemanaMin = galoesSemanaMax;
  galoesSemanaMin = Math.max(1, galoesSemanaMin);
  galoesSemanaMax = Math.max(1, galoesSemanaMax);

  const maior = PLANOS_PADRAO[PLANOS_PADRAO.length - 1];
  const planoSugerido = PLANOS_PADRAO.find((p) => p >= galoesMes) ?? maior;
  const excedente = Math.max(0, galoesMes - maior);

  const precoPlanoEstimado =
    Math.round(planoSugerido * PRECO_GALAO_AVULSO * (1 - DESCONTO_PLANO));

  return {
    moradores,
    litrosDia: Math.round(litrosDia * 10) / 10,
    litrosSemana: Math.round(litrosDia * 7),
    galoesMes,
    galoesSemanaMin,
    galoesSemanaMax,
    planoSugerido,
    excedente,
    precoPlanoEstimado,
  };
}

export function formatarReais(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** "4", "4 a 5"… — galões por semana de um plano mensal (mesma regra do simulador). */
export function porSemanaTexto(galoesMes: number): string {
  const s = galoesMes / SEMANAS_POR_MES;
  let min = Math.floor(s);
  let max = Math.ceil(s);
  if (s - min < 0.15) max = min;
  else if (max - s < 0.15) min = max;
  min = Math.max(1, min);
  max = Math.max(1, max);
  return min === max ? String(min) : `${min} a ${max}`;
}
