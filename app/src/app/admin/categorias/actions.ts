"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { TIPOS_EDITAVEIS } from "@/lib/categorias";

export type EstadoCategoria = { erro?: string; ok?: string };

function atualizarTelas() {
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
}

/** Cria ou edita uma categoria do catálogo. Nas do sistema (galão, casco) só muda nome e ordem. */
export async function salvarCategoria(_: EstadoCategoria, form: FormData): Promise<EstadoCategoria> {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  const tipo = String(form.get("tipo") ?? "");
  const ordem = Math.max(0, Math.min(999, Math.floor(Number(form.get("ordem")) || 0)));
  if (nome.length < 2) return { erro: "Informe o nome da categoria." };

  const db = await getDb();
  const [repetida] = await db
    .select({ id: schema.categoriasProduto.id })
    .from(schema.categoriasProduto)
    .where(id ? and(eq(schema.categoriasProduto.nome, nome), ne(schema.categoriasProduto.id, id)) : eq(schema.categoriasProduto.nome, nome))
    .limit(1);
  if (repetida) return { erro: `Já existe a categoria ${nome}.` };

  if (!id) {
    const t = TIPOS_EDITAVEIS.find((x) => x.tipo === tipo);
    if (!t) return { erro: "Escolha o tipo (define as regras do produto)." };
    await db.insert(schema.categoriasProduto).values({ nome, tipo: t.tipo, ordem });
    atualizarTelas();
    return { ok: `${nome} criada.` };
  }
  if (!/^[0-9a-f-]{36}$/.test(id)) return { erro: "Categoria não encontrada." };
  const [c] = await db.select().from(schema.categoriasProduto).where(eq(schema.categoriasProduto.id, id)).limit(1);
  if (!c) return { erro: "Categoria não encontrada." };
  // O tipo não muda depois de criada: os produtos já cadastrados seguem as regras dele.
  await db.update(schema.categoriasProduto).set({ nome, ordem }).where(eq(schema.categoriasProduto.id, id));
  atualizarTelas();
  return { ok: "Salvo." };
}

/** Ativar/desativar ou excluir (só sem produtos, e nunca as do sistema). */
export async function acaoCategoria(form: FormData) {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const acao = String(form.get("acao") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await getDb();
  const [c] = await db.select().from(schema.categoriasProduto).where(eq(schema.categoriasProduto.id, id)).limit(1);
  if (!c || c.sistema) return;
  if (acao === "alternar") {
    await db.update(schema.categoriasProduto).set({ ativa: !c.ativa }).where(eq(schema.categoriasProduto.id, id));
  } else if (acao === "excluir") {
    const [uso] = await db.select({ n: count() }).from(schema.produtos).where(eq(schema.produtos.categoriaId, id));
    if (uso.n === 0) await db.delete(schema.categoriasProduto).where(eq(schema.categoriasProduto.id, id));
  }
  atualizarTelas();
}
