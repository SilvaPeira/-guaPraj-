import "server-only";
import type { CartaoPedido } from "@/components/AgendaLoja";
import type { PedidoAgenda } from "./operacao";
import { agoraLocal, paraMinutos } from "./tempo";
import { STATUS_FINAIS } from "./status";

/** Converte o pedido do banco no formato que a tela da agenda usa. */
export function paraCartao(p: PedidoAgenda): CartaoPedido {
  const agora = agoraLocal();
  const passou = p.data < agora.data || (p.data === agora.data && paraMinutos(p.horaFim) < agora.minutos);
  return {
    id: p.id,
    numero: p.numero,
    status: p.status,
    origem: p.origem,
    modo: p.modo,
    tipoHorario: p.tipoHorario,
    horaInicio: p.horaInicio,
    horaFim: p.horaFim,
    totalCentavos: p.totalCentavos,
    statusPagamento: p.statusPagamento,
    cascosTroca: p.cascosTroca,
    cascosComprados: p.cascosComprados,
    temAlcool: p.temAlcool,
    motivo: p.motivo,
    codigoRetirada: p.codigoRetirada,
    galoes: p.galoes,
    // Conta excluída pelo cliente (LGPD): o pedido fica, sem nome nem celular.
    clienteNome: p.cliente.telefone.startsWith("excluido:") ? "Conta excluída" : (p.cliente.nome ?? "Cliente"),
    clienteTelefone: p.cliente.telefone.startsWith("excluido:") ? "" : p.cliente.telefone,
    endereco: p.endereco
      ? {
          linha: [p.endereco.logradouro, p.endereco.numero, p.endereco.complemento].filter(Boolean).join(", "),
          bairro: p.endereco.bairro,
          referencia: p.endereco.referencia,
          lat: p.endereco.lat,
          lng: p.endereco.lng,
        }
      : null,
    itens: p.itens.map((i) => ({
      id: i.id,
      nome: i.nome,
      qtd: i.qtd,
      trocaCasco: i.trocaCasco,
      diferencaCentavos: i.trocaCasco && i.precoCheioCentavos !== null ? i.precoCheioCentavos - i.precoUnitCentavos : 0,
      cascosFaltaram: i.cascosFaltaram,
    })),
    atrasado: passou && !STATUS_FINAIS.includes(p.status),
  };
}
