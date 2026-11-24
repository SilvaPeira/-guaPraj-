export const ROTULO_STATUS = {
  recebido: "Pedido recebido",
  confirmado: "Confirmado",
  separacao: "Em separação",
  saiu: "Saiu para entrega",
  entregue: "Entregue",
  pronto_retirada: "Pronto para retirada",
  retirado: "Retirado",
  nao_entregue: "Não entregue",
  cancelado: "Cancelado",
} as const;

export type StatusPedido = keyof typeof ROTULO_STATUS;

export const COR_STATUS: Record<StatusPedido, string> = {
  recebido: "selo-cinza",
  confirmado: "selo-rio",
  separacao: "selo-rio",
  saiu: "selo-acai",
  entregue: "selo-verde",
  pronto_retirada: "selo-acai",
  retirado: "selo-verde",
  nao_entregue: "selo-terra",
  cancelado: "selo-terra",
};

export const STATUS_FINAIS: StatusPedido[] = ["entregue", "retirado", "nao_entregue", "cancelado"];

export const ORIGEM = { avulso: "Avulso", plano: "Plano", extra: "Compra adicional" } as const;

/** Quais status podem vir depois de cada um (vale para a tela e para o servidor). */
const PERMITIDO: Record<StatusPedido, StatusPedido[]> = {
  recebido: ["confirmado", "cancelado"],
  confirmado: ["separacao", "saiu", "pronto_retirada", "nao_entregue", "cancelado"],
  separacao: ["saiu", "pronto_retirada", "nao_entregue", "cancelado"],
  saiu: ["entregue", "nao_entregue"],
  pronto_retirada: ["retirado", "nao_entregue"],
  entregue: [],
  retirado: [],
  nao_entregue: ["confirmado"],
  cancelado: [],
};

export function proximosStatus(s: StatusPedido, modo: "entrega" | "retirada"): StatusPedido[] {
  return PERMITIDO[s].filter((n) => (modo === "entrega" ? n !== "pronto_retirada" && n !== "retirado" : n !== "saiu" && n !== "entregue"));
}
