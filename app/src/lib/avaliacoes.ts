import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ErroPedido } from "./pedidos";

/** Cliente avalia um pedido entregue/retirado (uma vez só). */
export async function avaliarPedido(clienteId: string, pedidoId: string, nota: number, comentario: string | null) {
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) throw new ErroPedido("Escolha de 1 a 5 estrelas.");
  const db = await getDb();
  const r = await db
    .update(schema.pedidos)
    .set({ nota, comentario: comentario?.trim().slice(0, 300) || null })
    .where(
      and(
        eq(schema.pedidos.id, pedidoId),
        eq(schema.pedidos.clienteId, clienteId),
        inArray(schema.pedidos.status, ["entregue", "retirado"]),
        isNull(schema.pedidos.nota),
      ),
    )
    .returning({ id: schema.pedidos.id });
  if (!r.length) throw new ErroPedido("Este pedido não pode ser avaliado.");
}

/** Média e quantidade de avaliações de uma ou várias lojas. */
export async function mediasDasLojas(lojaIds: string[]): Promise<Map<string, { media: number; total: number }>> {
  const mapa = new Map<string, { media: number; total: number }>();
  if (!lojaIds.length) return mapa;
  const db = await getDb();
  const linhas = await db
    .select({ lojaId: schema.pedidos.lojaId, media: sql<number>`avg(${schema.pedidos.nota})::float`, total: sql<number>`count(${schema.pedidos.nota})::int` })
    .from(schema.pedidos)
    .where(and(inArray(schema.pedidos.lojaId, lojaIds), isNotNull(schema.pedidos.nota)))
    .groupBy(schema.pedidos.lojaId);
  for (const l of linhas) mapa.set(l.lojaId, { media: l.media, total: l.total });
  return mapa;
}

export async function avaliacoesRecentes(lojaId: string, limite = 10) {
  const db = await getDb();
  return db
    .select({ nota: schema.pedidos.nota, comentario: schema.pedidos.comentario, data: schema.pedidos.data, numero: schema.pedidos.numero, cliente: schema.usuarios.nome })
    .from(schema.pedidos)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.pedidos.clienteId))
    .where(and(eq(schema.pedidos.lojaId, lojaId), isNotNull(schema.pedidos.nota)))
    .orderBy(desc(schema.pedidos.data))
    .limit(limite);
}

/** "★ 4,8 (12)" */
export function textoNota(m?: { media: number; total: number }): string | null {
  if (!m || m.total === 0) return null;
  return `★ ${m.media.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} (${m.total})`;
}
