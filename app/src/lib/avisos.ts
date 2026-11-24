import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { descreverHorario } from "./agenda";
import { enviarWhatsApp } from "./mensagens";
import { dataBonita } from "./tempo";
import type { StatusPedido } from "./status";

// Mensagens de WhatsApp para o cliente e para a loja (seção 3 do plano).
// Sem provedor configurado, as mensagens só vão para o log do servidor.

function urlApp() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type Evento = Extract<StatusPedido, "confirmado" | "saiu" | "entregue" | "retirado" | "pronto_retirada" | "nao_entregue" | "cancelado"> | "reagendado";

async function dadosDoPedido(pedidoId: string) {
  const db = await getDb();
  const [r] = await db
    .select({ p: schema.pedidos, loja: { nome: schema.lojas.nome, slug: schema.lojas.slug }, cliente: { nome: schema.usuarios.nome, telefone: schema.usuarios.telefone } })
    .from(schema.pedidos)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.pedidos.clienteId))
    .where(eq(schema.pedidos.id, pedidoId))
    .limit(1);
  return r ?? null;
}

export function textoAviso(evento: Evento, d: NonNullable<Awaited<ReturnType<typeof dadosDoPedido>>>): string | null {
  const { p, loja } = d;
  const quando = `${dataBonita(p.data).toLowerCase()}, ${descreverHorario(p.tipoHorario, p.horaInicio, p.horaFim)}`;
  const link = `${urlApp()}/pedidos/${p.id}`;
  switch (evento) {
    case "confirmado":
      return `✅ ${loja.nome}: seu pedido #${p.numero} está confirmado para ${quando}.`;
    case "saiu":
      return `🚚 ${loja.nome}: seu pedido #${p.numero} saiu para entrega!${p.cascosTroca ? ` Deixe ${p.cascosTroca} casco(s) vazio(s) separado(s).` : ""}${p.temAlcool ? " Tenha um documento com foto em mãos." : ""}`;
    case "pronto_retirada":
      return `📦 ${loja.nome}: seu pedido #${p.numero} está pronto para retirada. Código: ${p.codigoRetirada ?? "-"}.`;
    case "entregue":
    case "retirado":
      return `💧 Pedido #${p.numero} da ${loja.nome} ${evento === "entregue" ? "entregue" : "retirado"}. Como foi? Avalie em 1 toque: ${link}`;
    case "nao_entregue":
      return `⚠️ ${loja.nome}: não conseguimos concluir o pedido #${p.numero} (${p.motivo ?? "sem motivo"}). A loja vai combinar uma nova data com você.`;
    case "reagendado":
      return `📅 ${loja.nome}: seu pedido #${p.numero} foi remarcado para ${quando}.`;
    case "cancelado":
      return `❌ ${loja.nome}: o pedido #${p.numero} foi cancelado (${p.motivo ?? "sem motivo"}).`;
    default:
      return null;
  }
}

/** Avisa o cliente sobre uma mudança no pedido. Nunca derruba a operação se o envio falhar. */
export async function avisarCliente(pedidoId: string, evento: Evento): Promise<void> {
  try {
    const d = await dadosDoPedido(pedidoId);
    if (!d) return;
    const texto = textoAviso(evento, d);
    if (texto) await enviarWhatsApp(d.cliente.telefone, texto);
  } catch (e) {
    console.error("[avisos] falha ao avisar cliente", pedidoId, e);
  }
}

export async function avisarVarios(pedidoIds: string[], evento: Evento) {
  await Promise.allSettled(pedidoIds.map((id) => avisarCliente(id, evento)));
}

/** Lembretes da véspera: cliente (entrega de amanhã) e loja (pedidos para confirmar). */
export async function enviarLembretesDaVespera(amanha: string): Promise<{ clientes: number; lojas: number }> {
  const db = await getDb();
  const pedidos = await db
    .select({ p: schema.pedidos, loja: { nome: schema.lojas.nome, telefone: schema.lojas.telefone }, cliente: { telefone: schema.usuarios.telefone } })
    .from(schema.pedidos)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.pedidos.clienteId))
    .where(and(eq(schema.pedidos.data, amanha), inArray(schema.pedidos.status, ["recebido", "confirmado"])));

  let clientes = 0;
  for (const { p, loja, cliente } of pedidos) {
    const quando = descreverHorario(p.tipoHorario, p.horaInicio, p.horaFim);
    const extra = p.origem === "plano" ? ` Precisa pular? ${urlApp()}/assinatura` : "";
    const r = await enviarWhatsApp(cliente.telefone, `💧 Lembrete ${loja.nome}: amanhã, ${quando}, chega seu pedido #${p.numero}.${extra}`);
    if (r.ok) clientes++;
  }

  // Loja: quantos pedidos de amanhã ainda estão sem confirmação.
  const porLoja = new Map<string, { nome: string; telefone: string; n: number }>();
  for (const { p, loja } of pedidos) {
    if (p.status !== "recebido") continue;
    const atual = porLoja.get(p.lojaId) ?? { ...loja, n: 0 };
    atual.n++;
    porLoja.set(p.lojaId, atual);
  }
  let lojas = 0;
  for (const l of porLoja.values()) {
    const r = await enviarWhatsApp(l.telefone, `📋 ÁguaPrajá: você tem ${l.n} pedido(s) para amanhã esperando confirmação. Confirme na agenda: ${urlApp()}/loja`);
    if (r.ok) lojas++;
  }
  return { clientes, lojas };
}

/** Loja recebe um WhatsApp a cada pedido novo (avulso ou compra adicional). */
export async function avisarLojaNovoPedido(pedidoId: string): Promise<void> {
  try {
    const d = await dadosDoPedido(pedidoId);
    if (!d) return;
    const db = await getDb();
    const [l] = await db.select({ telefone: schema.lojas.telefone }).from(schema.lojas).where(eq(schema.lojas.id, d.p.lojaId)).limit(1);
    const quando = `${dataBonita(d.p.data).toLowerCase()}, ${descreverHorario(d.p.tipoHorario, d.p.horaInicio, d.p.horaFim)}`;
    await enviarWhatsApp(l.telefone, `🔔 Novo pedido #${d.p.numero} de ${d.cliente.nome ?? "cliente"} para ${quando}. Confirme na agenda: ${urlApp()}/loja?data=${d.p.data}`);
  } catch (e) {
    console.error("[avisos] falha ao avisar loja", pedidoId, e);
  }
}

/** Pagamento online aprovado: avisa a loja (e confirma para o cliente). */
export async function avisarLojaPagamento(pedidoId: string): Promise<void> {
  try {
    const d = await dadosDoPedido(pedidoId);
    if (!d) return;
    const db = await getDb();
    const [l] = await db.select({ telefone: schema.lojas.telefone }).from(schema.lojas).where(eq(schema.lojas.id, d.p.lojaId)).limit(1);
    const valor = (d.p.totalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const meio = d.p.pagamentoMeio === "pix" ? "Pix" : "cartão";
    await enviarWhatsApp(l.telefone, `💳 Pedido #${d.p.numero} pago pelo app (${meio}, ${valor}). Não precisa cobrar na entrega.`);
    await enviarWhatsApp(d.cliente.telefone, `💳 ${d.loja.nome}: recebemos o pagamento do pedido #${d.p.numero} (${valor}). Obrigado!`);
  } catch (e) {
    console.error("[avisos] falha ao avisar pagamento", pedidoId, e);
  }
}
