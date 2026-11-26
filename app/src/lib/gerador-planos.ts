/**
 * Gerador de planos mensais a partir do valor do galão (tela Planos da distribuidora).
 * Usado na prévia (navegador) e na hora de criar (servidor): a conta é a mesma nos dois.
 *
 * preço do plano = galões × valor do galão × (1 + ajuste%)
 *   ajuste positivo = acréscimo; negativo = desconto. Arredondado ao centavo.
 * Ex.: 12 galões × R$ 7,99 = R$ 95,88; com +10% = R$ 105,47.
 */

export const MAX_GALOES = 300;
export const MAX_PLANOS_DE_UMA_VEZ = 30;

export type Pedido = { valorGalaoCentavos: number; ajustePercentual: number } & ({ modo: "um"; galoes: number } | { modo: "multiplos"; passo: number; inicio: number; ate: number });

export function precoDoPlano(galoes: number, valorGalaoCentavos: number, ajustePercentual: number): number {
  return Math.round(galoes * valorGalaoCentavos * (1 + ajustePercentual / 100));
}

/** Quantidades a criar. Múltiplos: do "início" até o "até", de "passo" em "passo" (ex.: 8, 12, 16… com passo 4). */
export function quantidades(p: Pedido): number[] {
  if (p.modo === "um") return Number.isInteger(p.galoes) && p.galoes >= 1 && p.galoes <= MAX_GALOES ? [p.galoes] : [];
  const { passo, inicio, ate } = p;
  if (![passo, inicio, ate].every(Number.isInteger) || passo < 1 || inicio < 1 || ate < inicio || ate > MAX_GALOES) return [];
  const out: number[] = [];
  for (let g = inicio; g <= ate && out.length < MAX_PLANOS_DE_UMA_VEZ; g += passo) out.push(g);
  return out;
}

/** Erro para mostrar, ou null se dá para gerar. */
export function validar(p: Pedido): string | null {
  if (!Number.isInteger(p.valorGalaoCentavos) || p.valorGalaoCentavos < 1) return "Informe o valor do galão.";
  if (!Number.isFinite(p.ajustePercentual) || p.ajustePercentual <= -100 || p.ajustePercentual > 200) return "O ajuste vai de −99% a +200%.";
  if (p.modo === "um" && !quantidades(p).length) return `Informe de 1 a ${MAX_GALOES} galões.`;
  if (p.modo === "multiplos") {
    if (!Number.isInteger(p.passo) || p.passo < 1) return "Informe de quantos em quantos galões (ex.: 4).";
    if (!Number.isInteger(p.inicio) || p.inicio < 1) return "Informe o primeiro plano (ex.: 8 galões).";
    if (!Number.isInteger(p.ate) || p.ate < p.inicio || p.ate > MAX_GALOES) return `O último plano precisa ser maior que o primeiro e até ${MAX_GALOES} galões.`;
  }
  return null;
}

export function gerar(p: Pedido): { galoes: number; precoCentavos: number }[] {
  if (validar(p)) return [];
  return quantidades(p).map((g) => ({ galoes: g, precoCentavos: precoDoPlano(g, p.valorGalaoCentavos, p.ajustePercentual) }));
}

/** Lê o formulário (mesmos nomes de campo na prévia e na action). */
export function lerPedido(v: (campo: string) => string, reaisParaCentavos: (s: string) => number | null): Pedido {
  const int = (c: string) => Number(v(c).replace(/\D/g, "") || "NaN");
  const pct = Number(v("ajuste").replace(",", ".") || "0");
  const sinal = v("sentido") === "desconto" ? -1 : 1;
  const base = { valorGalaoCentavos: reaisParaCentavos(v("valorGalao")) ?? 0, ajustePercentual: sinal * Math.abs(pct) };
  return v("modo") === "multiplos" ? { ...base, modo: "multiplos", passo: int("passo"), inicio: int("inicio"), ate: int("ate") } : { ...base, modo: "um", galoes: int("galoes") };
}
