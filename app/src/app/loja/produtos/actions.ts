"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { CATEGORIAS, type Categoria } from "@/lib/catalogo";
import { primeiroErro, reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string; ok?: string };

const esquemaNovo = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto.").max(80),
  categoria: z.enum(Object.keys(CATEGORIAS) as [Categoria, ...Categoria[]], { message: "Escolha a categoria." }),
  preco: z.unknown(),
});

export async function criarProduto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const r = esquemaNovo.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: primeiroErro(r.error) };
  const preco = reaisParaCentavos(r.data.preco);
  if (!preco) return { erro: "Informe o preço." };
  const alcoolico = r.data.categoria === "alcoolica";
  if (alcoolico && !loja.vendeAlcool) {
    return { erro: "Sua loja não está habilitada para bebida alcoólica. Ative em Ajustes (precisa de alvará)." };
  }
  await db.insert(schema.produtos).values({
    lojaId: loja.id,
    nome: r.data.nome,
    categoria: r.data.categoria,
    retornavel: r.data.categoria === "agua_galao",
    alcoolico,
    precoCentavos: preco,
    ordem: r.data.categoria === "casco" ? 99 : 10,
  });
  revalidatePath("/loja/produtos");
  return { ok: `${r.data.nome} adicionado.` };
}

export async function atualizarProduto(form: FormData) {
  const { loja, db } = await exigirLoja();
  const id = String(form.get("id") ?? "");
  const acao = String(form.get("acao") ?? "");
  const onde = and(eq(schema.produtos.id, id), eq(schema.produtos.lojaId, loja.id));
  if (acao === "alternar") {
    const [p] = await db.select().from(schema.produtos).where(onde).limit(1);
    if (p) await db.update(schema.produtos).set({ disponivel: !p.disponivel }).where(onde);
  } else if (acao === "preco") {
    const preco = reaisParaCentavos(form.get("preco"));
    if (preco) await db.update(schema.produtos).set({ precoCentavos: preco }).where(onde);
  }
  revalidatePath("/loja/produtos");
}
