"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string; ok?: string };

export async function salvarPlano(form: FormData) {
  const { loja, db } = await exigirLoja();
  const id = String(form.get("id") ?? "");
  const onde = and(eq(schema.planos.id, id), eq(schema.planos.lojaId, loja.id));
  if (form.get("acao") === "alternar") {
    const [p] = await db.select().from(schema.planos).where(onde).limit(1);
    if (p) await db.update(schema.planos).set({ ativo: !p.ativo }).where(onde);
  } else {
    const preco = reaisParaCentavos(form.get("preco"));
    if (preco) await db.update(schema.planos).set({ precoCentavos: preco }).where(onde);
  }
  revalidatePath("/loja/planos");
}

export async function criarPlano(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const galoes = Number(form.get("galoes"));
  const preco = reaisParaCentavos(form.get("preco"));
  if (!Number.isInteger(galoes) || galoes < 2 || galoes > 300) return { erro: "Quantidade de galões entre 2 e 300." };
  if (!preco) return { erro: "Informe o preço do plano." };
  const [galao] = await db
    .select({ id: schema.produtos.id })
    .from(schema.produtos)
    .where(and(eq(schema.produtos.lojaId, loja.id), eq(schema.produtos.categoria, "agua_galao")))
    .limit(1);
  if (!galao) return { erro: "Cadastre um galão de 20 L no catálogo primeiro." };
  const existentes = await db.select({ g: schema.planos.galoesMes }).from(schema.planos).where(eq(schema.planos.lojaId, loja.id));
  if (existentes.some((e) => e.g === galoes)) return { erro: `Já existe um plano de ${galoes} galões.` };
  await db.insert(schema.planos).values({ lojaId: loja.id, produtoId: galao.id, galoesMes: galoes, precoCentavos: preco });
  revalidatePath("/loja/planos");
  return { ok: `Plano de ${galoes} galões criado.` };
}
