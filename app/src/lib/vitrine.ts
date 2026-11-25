import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { podeVender } from "./catalogo";
import { mediasDasLojas, textoNota } from "./avaliacoes";
import { aceitaNovoAssinante, recursosDaLoja } from "./planos-app";

// Distribuidoras para o site público (calculadora → lojas disponíveis).
// Só o que a loja já mostra para qualquer cliente: nome, bairro, área, preços e planos.

export type LojaVitrine = {
  id: string;
  nome: string;
  bairro: string;
  cidade: string;
  lat: number;
  lng: number;
  fazEntrega: boolean;
  raioKm: number;
  fazRetirada: boolean;
  taxaEntregaCentavos: number;
  precoGalaoCentavos: number | null;
  planos: { galoesMes: number; precoCentavos: number }[];
  nota: string | null;
  /** Endereço do site próprio (só plano com app próprio). */
  slug: string | null;
  aceitaAssinantes: boolean;
};

export async function lojasDaVitrine(): Promise<LojaVitrine[]> {
  const db = await getDb();
  const lojas = await db
    .select({
      id: schema.lojas.id,
      nome: schema.lojas.nome,
      bairro: schema.lojas.bairro,
      cidade: schema.lojas.cidade,
      lat: schema.lojas.lat,
      lng: schema.lojas.lng,
      fazEntrega: schema.lojas.fazEntrega,
      raioKm: schema.lojas.raioKm,
      fazRetirada: schema.lojas.fazRetirada,
      taxaEntregaCentavos: schema.lojas.taxaEntregaCentavos,
      slug: schema.lojas.slug,
    })
    .from(schema.lojas)
    .where(eq(schema.lojas.status, "aprovada"))
    .orderBy(asc(schema.lojas.nome));
  if (!lojas.length) return [];
  const ids = lojas.map((l) => l.id);
  const [planos, galoes, notas] = await Promise.all([
    db
      .select({ lojaId: schema.planos.lojaId, galoesMes: schema.planos.galoesMes, precoCentavos: schema.planos.precoCentavos })
      .from(schema.planos)
      .where(and(inArray(schema.planos.lojaId, ids), eq(schema.planos.ativo, true)))
      .orderBy(asc(schema.planos.galoesMes)),
    db.select().from(schema.produtos).where(and(inArray(schema.produtos.lojaId, ids), eq(schema.produtos.categoria, "agua_galao"))),
    mediasDasLojas(ids),
  ]);

  const saida: LojaVitrine[] = [];
  for (const l of lojas) {
    const galao = galoes.filter((g) => g.lojaId === l.id && podeVender(g)).sort((a, b) => a.precoCentavos - b.precoCentavos)[0];
    const [rec, aceita] = await Promise.all([recursosDaLoja(l.id), aceitaNovoAssinante(l.id)]);
    saida.push({
      ...l,
      precoGalaoCentavos: galao?.precoCentavos ?? null,
      planos: planos.filter((p) => p.lojaId === l.id).map(({ galoesMes, precoCentavos }) => ({ galoesMes, precoCentavos })),
      nota: textoNota(notas.get(l.id)) ?? null,
      slug: rec.appProprio ? l.slug : null,
      aceitaAssinantes: aceita,
    });
  }
  return saida;
}
