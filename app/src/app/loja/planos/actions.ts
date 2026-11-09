"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string; ok?: string };

/** Planos sugeridos (opcional): 8 a 32 galões com 10% de desconto sobre o avulso. */
const SUGERIDOS = [8, 12, 16, 20, 24, 32];

async function galaoDaLoja(lojaId: string) {
  const { db } = await exigirLoja();
  const [galao] = await db
    .select()
    .from(schema.produtos)
    .where(and(eq(schema.produtos.lojaId, lojaId), eq(schema.produtos.categoria, "agua_galao")))
    .limit(1);
  return galao ?? null;
}

export async function salvarPlano(form: FormData) {
  const { loja, db } = await exigirLoja();
  const id = String(form.get("id") ?? "");
  const acao = String(form.get("acao") ?? "salvar");
  const onde = and(eq(schema.planos.id, id), eq(schema.planos.lojaId, loja.id));
  const [p] = await db.select().from(schema.planos).where(onde).limit(1);
  if (!p) return;

  if (acao === "alternar") {
    await db.update(schema.planos).set({ ativo: !p.ativo }).where(onde);
  } else if (acao === "excluir") {
    // Só exclui se ninguém assinou; senão o certo é desativar (mantém o histórico).
    const [{ n }] = await db.select({ n: count() }).from(schema.assinaturas).where(eq(schema.assinaturas.planoId, p.id));
    if (n === 0) await db.delete(schema.planos).where(onde);
    else await db.update(schema.planos).set({ ativo: false }).where(onde);
  } else {
    const preco = reaisParaCentavos(form.get("preco"));
    const galoes = Number(form.get("galoes"));
    const mudanca: { precoCentavos?: number; galoesMes?: number } = {};
    if (preco) mudanca.precoCentavos = preco;
    // A quantidade só pode mudar enquanto não houver assinantes.
    if (Number.isInteger(galoes) && galoes >= 1 && galoes <= 300 && galoes !== p.galoesMes) {
      const [{ n }] = await db.select({ n: count() }).from(schema.assinaturas).where(eq(schema.assinaturas.planoId, p.id));
      if (n === 0) mudanca.galoesMes = galoes;
    }
    if (Object.keys(mudanca).length) await db.update(schema.planos).set(mudanca).where(onde);
  }
  revalidatePath("/loja/planos");
}

export async function criarPlano(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const galoes = Number(form.get("galoes"));
  const preco = reaisParaCentavos(form.get("preco"));
  if (!Number.isInteger(galoes) || galoes < 1 || galoes > 300) return { erro: "Informe de 1 a 300 galões por mês." };
  if (!preco) return { erro: "Informe o preço do plano." };
  const galao = await galaoDaLoja(loja.id);
  if (!galao) return { erro: "Cadastre um galão de 20 L no catálogo primeiro." };
  const existentes = await db.select({ g: schema.planos.galoesMes }).from(schema.planos).where(eq(schema.planos.lojaId, loja.id));
  if (existentes.some((e) => e.g === galoes)) return { erro: `Já existe um plano de ${galoes} galões.` };
  await db.insert(schema.planos).values({ lojaId: loja.id, produtoId: galao.id, galoesMes: galoes, precoCentavos: preco });
  revalidatePath("/loja/planos");
  return { ok: `Plano de ${galoes} ${galoes === 1 ? "galão" : "galões"} por ${(preco / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} criado.` };
}

export async function criarSugeridos() {
  const { loja, db } = await exigirLoja();
  const galao = await galaoDaLoja(loja.id);
  if (!galao) return;
  const existentes = new Set((await db.select({ g: schema.planos.galoesMes }).from(schema.planos).where(eq(schema.planos.lojaId, loja.id))).map((e) => e.g));
  const novos = SUGERIDOS.filter((g) => !existentes.has(g)).map((g) => ({
    lojaId: loja.id,
    produtoId: galao.id,
    galoesMes: g,
    precoCentavos: Math.round((g * galao.precoCentavos * 0.9) / 100) * 100,
  }));
  if (novos.length) await db.insert(schema.planos).values(novos);
  revalidatePath("/loja/planos");
}
