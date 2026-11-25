"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";

export type EstadoCidade = { erro?: string; ok?: string };

const UFS = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));

function atualizarTelas() {
  revalidatePath("/admin/cidades");
  revalidatePath("/", "layout");
}

/** Cria ou edita uma cidade atendida. Renomear também corrige lojas e endereços já cadastrados nela. */
export async function salvarCidade(_: EstadoCidade, form: FormData): Promise<EstadoCidade> {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const uf = String(form.get("uf") ?? "")
    .trim()
    .toUpperCase();
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const ordem = Math.max(0, Math.min(999, Math.floor(Number(form.get("ordem")) || 0)));
  if (nome.length < 2) return { erro: "Informe o nome da cidade." };
  if (!UFS.has(uf)) return { erro: "Escolha o estado (UF)." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || String(form.get("lat") ?? "") === "") return { erro: "Marque o centro da cidade no mapa." };

  const db = await getDb();
  const [repetida] = await db
    .select({ id: schema.cidades.id })
    .from(schema.cidades)
    .where(id ? and(eq(schema.cidades.nome, nome), ne(schema.cidades.id, id)) : eq(schema.cidades.nome, nome))
    .limit(1);
  if (repetida) return { erro: `${nome} já está cadastrada.` };

  if (!id) {
    await db.insert(schema.cidades).values({ nome, uf, lat, lng, ordem });
    atualizarTelas();
    return { ok: `${nome} adicionada.` };
  }
  if (!/^[0-9a-f-]{36}$/.test(id)) return { erro: "Cidade não encontrada." };
  await db.transaction(async (tx) => {
    const [antes] = await tx.select().from(schema.cidades).where(eq(schema.cidades.id, id)).limit(1);
    if (!antes) return;
    await tx.update(schema.cidades).set({ nome, uf, lat, lng, ordem }).where(eq(schema.cidades.id, id));
    if (antes.nome !== nome) {
      await tx.update(schema.lojas).set({ cidade: nome }).where(eq(schema.lojas.cidade, antes.nome));
      await tx.update(schema.enderecos).set({ cidade: nome }).where(eq(schema.enderecos.cidade, antes.nome));
    }
  });
  atualizarTelas();
  return { ok: "Salvo." };
}

/** Ativar/desativar ou excluir (só quando ninguém está cadastrado nela). */
export async function acaoCidade(form: FormData) {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const acao = String(form.get("acao") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await getDb();
  const [c] = await db.select().from(schema.cidades).where(eq(schema.cidades.id, id)).limit(1);
  if (!c) return;
  if (acao === "alternar") {
    await db.update(schema.cidades).set({ ativa: !c.ativa }).where(eq(schema.cidades.id, id));
  } else if (acao === "excluir") {
    const [loja] = await db.select({ id: schema.lojas.id }).from(schema.lojas).where(eq(schema.lojas.cidade, c.nome)).limit(1);
    const [end] = await db.select({ id: schema.enderecos.id }).from(schema.enderecos).where(eq(schema.enderecos.cidade, c.nome)).limit(1);
    if (!loja && !end) await db.delete(schema.cidades).where(eq(schema.cidades.id, id));
  }
  atualizarTelas();
}
