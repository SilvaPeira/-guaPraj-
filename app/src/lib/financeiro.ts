import "server-only";
import { and, eq, gte, inArray, lte, ne, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { somarDias } from "./tempo";

/** Primeiro e último dia de um mês "AAAA-MM". */
export function limitesDoMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split("-").map(Number);
  const de = `${mes}-01`;
  const prox = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);
  return { de, ate: somarDias(prox, -1) };
}

export function mesVizinho(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export async function resumoDoMes(lojaId: string, mes: string) {
  const db = await getDb();
  const { de, ate } = limitesDoMes(mes);
  const noMes = and(eq(schema.pedidos.lojaId, lojaId), gte(schema.pedidos.data, de), lte(schema.pedidos.data, ate));

  const [porOrigem, galoes, assinaturas, pendentes] = await Promise.all([
    db
      .select({
        origem: schema.pedidos.origem,
        pago: sql<number>`coalesce(sum(case when ${schema.pedidos.statusPagamento} = 'pago' then ${schema.pedidos.totalCentavos} end), 0)::int`,
        aReceber: sql<number>`coalesce(sum(case when ${schema.pedidos.statusPagamento} <> 'pago' and ${schema.pedidos.status} in ('entregue','retirado') then ${schema.pedidos.totalCentavos} end), 0)::int`,
        previsto: sql<number>`coalesce(sum(case when ${schema.pedidos.statusPagamento} <> 'pago' and ${schema.pedidos.status} not in ('entregue','retirado','cancelado','nao_entregue') then ${schema.pedidos.totalCentavos} end), 0)::int`,
        pedidosPagos: sql<number>`count(*) filter (where ${schema.pedidos.statusPagamento} = 'pago' and ${schema.pedidos.totalCentavos} > 0)::int`,
        concluidos: sql<number>`count(*) filter (where ${schema.pedidos.status} in ('entregue','retirado'))::int`,
      })
      .from(schema.pedidos)
      .where(and(noMes, ne(schema.pedidos.status, "cancelado")))
      .groupBy(schema.pedidos.origem),
    db
      .select({ total: sql<number>`coalesce(sum(${schema.itensPedido.qtd}), 0)::int` })
      .from(schema.pedidos)
      .innerJoin(schema.itensPedido, eq(schema.itensPedido.pedidoId, schema.pedidos.id))
      .where(and(noMes, inArray(schema.pedidos.status, ["entregue", "retirado"]), eq(schema.itensPedido.retornavel, true))),
    db
      .select({ status: schema.assinaturas.status, n: sql<number>`count(*)::int` })
      .from(schema.assinaturas)
      .where(eq(schema.assinaturas.lojaId, lojaId))
      .groupBy(schema.assinaturas.status),
    // Entregues e ainda não pagos (de qualquer mês): para a loja cobrar.
    db
      .select({
        id: schema.pedidos.id,
        numero: schema.pedidos.numero,
        data: schema.pedidos.data,
        total: schema.pedidos.totalCentavos,
        cliente: schema.usuarios.nome,
        telefone: schema.usuarios.telefone,
      })
      .from(schema.pedidos)
      .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.pedidos.clienteId))
      .where(
        and(
          eq(schema.pedidos.lojaId, lojaId),
          inArray(schema.pedidos.status, ["entregue", "retirado"]),
          notInArray(schema.pedidos.statusPagamento, ["pago", "estornado"]),
          sql`${schema.pedidos.totalCentavos} > 0`,
        ),
      )
      .orderBy(schema.pedidos.data),
  ]);

  const soma = (k: "pago" | "aReceber" | "previsto" | "pedidosPagos" | "concluidos") => porOrigem.reduce((s, o) => s + o[k], 0);
  const origem = (o: string) => porOrigem.find((x) => x.origem === o)?.pago ?? 0;
  const recebido = soma("pago");
  const pedidosPagos = soma("pedidosPagos");
  const conta = (s: string) => assinaturas.find((a) => a.status === s)?.n ?? 0;

  return {
    recebido,
    aReceber: soma("aReceber"),
    previsto: soma("previsto"),
    ticketMedio: pedidosPagos ? Math.round(recebido / pedidosPagos) : 0,
    concluidos: soma("concluidos"),
    galoes: galoes[0]?.total ?? 0,
    recebidoPorOrigem: { plano: origem("plano"), avulso: origem("avulso"), extra: origem("extra") },
    assinantes: { ativos: conta("ativa"), pausados: conta("pausada"), cancelados: conta("cancelada") },
    pendentes,
  };
}

export async function marcarComoPago(lojaId: string, pedidoId: string) {
  const db = await getDb();
  await db
    .update(schema.pedidos)
    .set({ statusPagamento: "pago" })
    .where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.lojaId, lojaId), inArray(schema.pedidos.status, ["entregue", "retirado"])));
}
