// Regras de agenda: quando o plano entrega, que horários o cliente pode escolher
// e se ainda há vaga na janela (capacidade da loja).

import type { AgendaPlano, RegrasHorario } from "@/db/schema";
import { agoraLocal, deMinutos, diaDaSemana, diasEntre, DIAS_PLURAL, horaBonita, paraMinutos, somarDias } from "./tempo";

export const PERIODOS = {
  manha: { rotulo: "Manhã", inicio: "08:00", fim: "12:00" },
  tarde: { rotulo: "Tarde", inicio: "13:00", fim: "18:00" },
} as const;

export type TipoHorario = "imediato" | "exato" | "janela" | "periodo";

/** A data cai numa entrega do plano? */
export function entregaNaData(a: AgendaPlano, data: string): boolean {
  if (data < a.primeiraData) return false;
  const dow = diaDaSemana(data);
  if (!a.dias.includes(dow)) return false;
  if (a.frequencia === "semanal") return true;
  if (a.frequencia === "quinzenal") return Math.floor(diasEntre(a.primeiraData, data) / 7) % 2 === 0;
  // mensal: a primeira ocorrência daquele dia da semana no mês
  return Number(data.slice(8, 10)) <= 7;
}

/** Próximas datas de entrega do plano, a partir de `de` (inclusive). */
export function proximasEntregas(a: AgendaPlano, de: string, quantas: number, limiteDias = 120): string[] {
  const out: string[] = [];
  for (let i = 0; i < limiteDias && out.length < quantas; i++) {
    const d = somarDias(de, i);
    if (entregaNaData(a, d)) out.push(d);
  }
  return out;
}

/** Entregas por mês (média) e galões por mês que a agenda gera. */
export function galoesPorMes(a: Pick<AgendaPlano, "frequencia" | "dias" | "qtdPorEntrega">): number {
  const entregasMes = a.frequencia === "semanal" ? a.dias.length * 4.33 : a.frequencia === "quinzenal" ? 2.17 : 1;
  return Math.round(entregasMes * a.qtdPorEntrega);
}

/** Texto da ciência: "toda segunda, às 9h" etc. */
export function descreverAgenda(a: Pick<AgendaPlano, "frequencia" | "dias" | "tipoHorario" | "inicio" | "fim" | "qtdPorEntrega">): string {
  const dias = a.dias
    .slice()
    .sort()
    .map((d) => DIAS_PLURAL[d]);
  const listaDias = dias.length > 1 ? `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]}` : dias[0];
  const freq =
    a.frequencia === "semanal" ? `toda semana, ${listaDias}` : a.frequencia === "quinzenal" ? `a cada 15 dias, ${listaDias}` : `uma vez por mês, na primeira semana, ${listaDias}`;
  return `${freq}, ${descreverHorario(a.tipoHorario, a.inicio, a.fim)}, ${a.qtdPorEntrega} ${a.qtdPorEntrega === 1 ? "galão" : "galões"} por entrega`;
}

export function descreverHorario(tipo: TipoHorario, inicio: string, fim: string): string {
  if (tipo === "imediato") return "o quanto antes";
  if (tipo === "exato") return `às ${horaBonita(inicio)}`;
  if (tipo === "periodo") {
    const p = inicio === PERIODOS.manha.inicio ? "de manhã" : "à tarde";
    return `${p} (${horaBonita(inicio)}–${horaBonita(fim)})`;
  }
  return `entre ${horaBonita(inicio)} e ${horaBonita(fim)}`;
}

export type ErroHorario = string | null;

/** Valida um horário escolhido contra as regras da loja. Retorna mensagem de erro ou null. */
export function validarHorario(
  r: RegrasHorario,
  tipo: TipoHorario,
  data: string,
  inicio: string,
  fim: string,
  opcoes: { ehPlano?: boolean } = {},
): ErroHorario {
  if (!r.dias.includes(diaDaSemana(data))) return "A loja não abre nesse dia.";
  const abre = paraMinutos(r.abre);
  const fecha = paraMinutos(r.fecha);
  const agora = agoraLocal();
  if (tipo === "imediato") {
    if (opcoes.ehPlano) return "O plano usa horário marcado.";
    if (!r.aceitaImediato) return "A loja não aceita pedido “o quanto antes”.";
    if (data !== agora.data) return "“O quanto antes” é só para hoje.";
    if (agora.minutos < abre || agora.minutos + 15 > fecha) return "A loja está fechada agora. Escolha um horário.";
    return null;
  }
  const i = paraMinutos(inicio);
  const f = paraMinutos(fim);
  if (Number.isNaN(i) || Number.isNaN(f)) return "Horário inválido.";
  if (i < abre || f > fecha) return `A loja entrega entre ${horaBonita(r.abre)} e ${horaBonita(r.fecha)}.`;
  if (tipo === "exato") {
    if (!r.aceitaExato) return "A loja não aceita horário exato.";
    if (i !== f) return "Horário exato inválido.";
  }
  if (tipo === "janela" && f - i < r.janelaMinimaMin) return `A janela precisa ter pelo menos ${r.janelaMinimaMin} minutos.`;
  if (tipo === "periodo" && !(inicio === PERIODOS.manha.inicio || inicio === PERIODOS.tarde.inicio)) return "Período inválido.";
  if (!opcoes.ehPlano && data === agora.data && i < agora.minutos + 30) return "Escolha um horário pelo menos 30 minutos à frente.";
  return null;
}

/** Ajusta o período ao funcionamento da loja (ex.: loja fecha às 17h → tarde 13h–17h). */
export function periodoDaLoja(r: RegrasHorario, p: keyof typeof PERIODOS): { inicio: string; fim: string } | null {
  const ini = Math.max(paraMinutos(PERIODOS[p].inicio), paraMinutos(r.abre));
  const fim = Math.min(paraMinutos(PERIODOS[p].fim), paraMinutos(r.fecha));
  return fim - ini >= 60 ? { inicio: deMinutos(ini), fim: deMinutos(fim) } : null;
}

/** Janelas se sobrepõem? (para contar capacidade) */
export function sobrepoe(a: { inicio: string; fim: string }, b: { inicio: string; fim: string }): boolean {
  const ai = paraMinutos(a.inicio);
  const af = Math.max(paraMinutos(a.fim), ai + 1);
  const bi = paraMinutos(b.inicio);
  const bf = Math.max(paraMinutos(b.fim), bi + 1);
  return ai < bf && bi < af;
}

/** Capacidade de uma janela: períodos longos comportam proporcionalmente mais entregas. */
export function capacidadeDaJanela(r: RegrasHorario, inicio: string, fim: string): number {
  const dur = Math.max(paraMinutos(fim) - paraMinutos(inicio), r.janelaMinimaMin);
  return Math.max(r.capacidadePorJanela, Math.floor((dur / r.janelaMinimaMin) * r.capacidadePorJanela));
}

/** Texto da ciência que o cliente confirma — o mesmo no app e no servidor. */
export function textoAceite(agenda: Pick<AgendaPlano, "frequencia" | "dias" | "tipoHorario" | "inicio" | "fim" | "qtdPorEntrega">, modo: "entrega" | "retirada"): string {
  const acao = modo === "entrega" ? "minhas entregas serão" : "minhas retiradas serão";
  return `Estou ciente de que ${acao} ${descreverAgenda(agenda)}. Posso alterar o dia e o horário pelo app até a véspera.`;
}
