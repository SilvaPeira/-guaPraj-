"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { CATEGORIAS, type Categoria } from "@/lib/catalogo";
import { primeiroErro, reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string; ok?: string };

/** Estoque digitado: vazio = não controla; senão inteiro de 0 a 99999. */
function lerEstoque(v: FormDataEntryValue | null): { ok: true; valor: number | null } | { ok: false } {
  const s = String(v ?? "").trim();
  if (s === "") return { ok: true, valor: null };
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 99999 ? { ok: true, valor: n } : { ok: false };
}

const esquemaNovo = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto.").max(80),
  marca: z.string().trim().max(60).optional(),
  categoria: z.enum(Object.keys(CATEGORIAS) as [Categoria, ...Categoria[]], { message: "Escolha a categoria." }),
});

export async function criarProduto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const r = esquemaNovo.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: primeiroErro(r.error) };
  const preco = reaisParaCentavos(form.get("preco"));
  if (!preco) return { erro: "Informe o preço." };
  const estoque = lerEstoque(form.get("estoque"));
  if (!estoque.ok) return { erro: "Quantidade em estoque inválida (use um número inteiro, ou deixe vazio)." };
  const alcoolico = r.data.categoria === "alcoolica";
  if (alcoolico && !loja.vendeAlcool) {
    return { erro: "Sua loja não está habilitada para bebida alcoólica. Ative em Ajustes (precisa de alvará)." };
  }
  await db.insert(schema.produtos).values({
    lojaId: loja.id,
    nome: r.data.nome,
    marca: r.data.marca || null,
    categoria: r.data.categoria,
    retornavel: r.data.categoria === "agua_galao",
    alcoolico,
    precoCentavos: preco,
    estoque: estoque.valor,
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
  const [p] = await db.select().from(schema.produtos).where(onde).limit(1);
  if (!p) return;

  if (acao === "alternar") {
    await db.update(schema.produtos).set({ disponivel: !p.disponivel }).where(onde);
  } else if (acao === "salvar") {
    const preco = reaisParaCentavos(form.get("preco"));
    const estoque = lerEstoque(form.get("estoque"));
    const marca = String(form.get("marca") ?? "").trim().slice(0, 60) || null;
    await db
      .update(schema.produtos)
      .set({
        marca,
        ...(preco ? { precoCentavos: preco } : {}),
        ...(estoque.ok ? { estoque: estoque.valor } : {}),
      })
      .where(onde);
  } else if (acao === "somar" || acao === "tirar") {
    // Ajuste rápido de estoque (+1 / −1). Só para itens que controlam estoque.
    if (p.estoque !== null) {
      const novo = Math.max(0, p.estoque + (acao === "somar" ? 1 : -1));
      await db.update(schema.produtos).set({ estoque: novo }).where(onde);
    }
  }
  revalidatePath("/loja/produtos");
}
