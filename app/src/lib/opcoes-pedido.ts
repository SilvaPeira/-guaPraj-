import "server-only";
import type { RegrasHorario } from "@/db/schema";
import { periodoDaLoja } from "./agenda";
import { agoraLocal, dataBonita, diaDaSemana, paraMinutos, somarDias } from "./tempo";

export type OpcaoData = { data: string; rotulo: string; ehHoje: boolean };

/** Próximos dias em que a loja abre (hoje só se ainda dá tempo). */
export function datasDisponiveis(r: RegrasHorario, quantas = 7): OpcaoData[] {
  const agora = agoraLocal();
  const out: OpcaoData[] = [];
  for (let i = 0; i < 21 && out.length < quantas; i++) {
    const d = somarDias(agora.data, i);
    if (!r.dias.includes(diaDaSemana(d))) continue;
    if (i === 0 && agora.minutos + 45 > paraMinutos(r.fecha)) continue;
    out.push({ data: d, rotulo: dataBonita(d, agora.data), ehHoje: i === 0 });
  }
  return out;
}

/** Dados de horário que o formulário do cliente precisa. */
export function regrasParaCliente(r: RegrasHorario) {
  return {
    abre: r.abre,
    fecha: r.fecha,
    aceitaImediato: r.aceitaImediato,
    prazoImediatoMin: r.prazoImediatoMin,
    aceitaExato: r.aceitaExato,
    janelaMinimaMin: r.janelaMinimaMin,
    taxaExtraCentavos: r.taxaExtraCentavos,
    manha: periodoDaLoja(r, "manha"),
    tarde: periodoDaLoja(r, "tarde"),
    agoraMin: agoraLocal().minutos,
  };
}
export type RegrasCliente = ReturnType<typeof regrasParaCliente>;
