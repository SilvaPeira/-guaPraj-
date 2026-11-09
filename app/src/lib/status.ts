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
