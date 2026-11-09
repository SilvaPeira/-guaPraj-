import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { distanciaKm, RAIO_RETIRADA_KM } from "./geo";
import { podeVender } from "./catalogo";

export type Plano = typeof schema.planos.$inferSelect;

export type LojaProxima = {
  loja: typeof schema.lojas.$inferSelect;
  distanciaKm: number;
  /** Entrega neste endereço? (dentro do raio da loja) */
  entregaAqui: boolean;
  precoGalaoCentavos: number | null;
  planos: Plano[];
};

/** O menor plano ativo que cobre a necessidade; se nenhum cobre, o maior. */
export function planoSugerido(planos: Plano[], galoesMes: number): Plano | null {
  const ativos = planos.filter((p) => p.ativo).sort((a, b) => a.galoesMes - b.galoesMes);
  if (!ativos.length) return null;
  return ativos.find((p) => p.galoesMes >= galoesMes) ?? ativos[ativos.length - 1];
}

export function descontoPercentual(plano: Plano, precoAvulso: number | null): number {
  if (!precoAvulso) return 0;
  return Math.round((1 - plano.precoCentavos / (plano.galoesMes * precoAvulso)) * 100);
}

/** Lojas aprovadas que atendem o ponto: entregam (dentro do raio) ou são próximas para retirada. */
export async function lojasQueAtendem(ponto: { lat: number; lng: number }): Promise<LojaProxima[]> {
  const db = await getDb();
  const lojas = await db.select().from(schema.lojas).where(eq(schema.lojas.status, "aprovada"));
  const candidatas = lojas
    .map((loja) => {
      const d = distanciaKm(ponto, loja);
      const entregaAqui = loja.fazEntrega && d <= loja.raioKm;
      const retiraPerto = loja.fazRetirada && d <= RAIO_RETIRADA_KM;
      return { loja, distanciaKm: d, entregaAqui, atende: entregaAqui || retiraPerto };
    })
    .filter((c) => c.atende);
  if (!candidatas.length) return [];

  const ids = candidatas.map((c) => c.loja.id);
  const [planos, galoes] = await Promise.all([
    db.select().from(schema.planos).where(and(inArray(schema.planos.lojaId, ids), eq(schema.planos.ativo, true))),
    db
      .select()
      .from(schema.produtos)
      .where(and(inArray(schema.produtos.lojaId, ids), eq(schema.produtos.categoria, "agua_galao"))),
  ]);

  return candidatas
    .map((c) => {
      const galao = galoes.find((g) => g.lojaId === c.loja.id && podeVender(g));
      return {
        loja: c.loja,
        distanciaKm: c.distanciaKm,
        entregaAqui: c.entregaAqui,
        precoGalaoCentavos: galao?.precoCentavos ?? null,
        planos: planos.filter((p) => p.lojaId === c.loja.id),
      };
    })
    .filter((l) => l.precoGalaoCentavos !== null)
    .sort((a, b) => Number(b.entregaAqui) - Number(a.entregaAqui) || a.distanciaKm - b.distanciaKm);
}
