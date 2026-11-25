import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Categoria } from "./catalogo";

export type CategoriaCatalogo = typeof schema.categoriasProduto.$inferSelect;

/** Tipos que o admin pode escolher para uma categoria nova (galão e casco são do sistema). */
export const TIPOS_EDITAVEIS: { tipo: Categoria; nome: string; regras: string }[] = [
  { tipo: "agua", nome: "Água (garrafa, fardo)", regras: "pode ser retornável" },
  { tipo: "refrigerante", nome: "Refrigerante", regras: "pode ser retornável · plano Essencial ou Completo" },
  { tipo: "suco", nome: "Suco, isotônico, energético", regras: "pode ser retornável · plano Essencial ou Completo" },
  { tipo: "gelo", nome: "Gelo", regras: "plano Essencial ou Completo" },
  { tipo: "polpa", nome: "Polpa, açaí", regras: "plano Essencial ou Completo" },
  { tipo: "alcoolica", nome: "Bebida alcoólica", regras: "18+ e documento na entrega · loja com alvará · pode ser retornável" },
  { tipo: "acessorio", nome: "Acessório", regras: "sem regra especial" },
];

export async function listarCategorias(todas = false): Promise<CategoriaCatalogo[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.categoriasProduto)
    .where(todas ? undefined : eq(schema.categoriasProduto.ativa, true))
    .orderBy(asc(schema.categoriasProduto.ordem), asc(schema.categoriasProduto.nome));
}

export type MapaCategorias = { porId: Map<string, CategoriaCatalogo>; porTipo: Map<string, CategoriaCatalogo>; lista: CategoriaCatalogo[] };

/** Todas as categorias (inclusive desativadas: produto antigo continua com o nome certo). */
export async function mapaCategorias(): Promise<MapaCategorias> {
  const lista = await listarCategorias(true);
  const porTipo = new Map<string, CategoriaCatalogo>();
  for (const c of lista) if (!porTipo.has(c.tipo)) porTipo.set(c.tipo, c);
  return { porId: new Map(lista.map((c) => [c.id, c])), porTipo, lista };
}

/** Categoria do produto: a escolhida; se não tiver (produto antigo), a primeira do mesmo tipo. */
export function categoriaDo(p: { categoria: string; categoriaId: string | null }, m: MapaCategorias): { id: string; nome: string; ordem: number } {
  const c = (p.categoriaId ? m.porId.get(p.categoriaId) : undefined) ?? m.porTipo.get(p.categoria);
  return c ? { id: c.id, nome: c.nome, ordem: c.ordem } : { id: p.categoria, nome: "Outros", ordem: 999 };
}

/** Agrupa produtos pela categoria do catálogo, na ordem do painel. Só grupos com itens. */
export function agruparPorCategoria<T extends { categoria: string; categoriaId: string | null }>(itens: T[], m: MapaCategorias) {
  const grupos = new Map<string, { id: string; nome: string; ordem: number; itens: T[] }>();
  for (const it of itens) {
    const c = categoriaDo(it, m);
    const g = grupos.get(c.id) ?? { ...c, itens: [] };
    g.itens.push(it);
    grupos.set(c.id, g);
  }
  return [...grupos.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}
