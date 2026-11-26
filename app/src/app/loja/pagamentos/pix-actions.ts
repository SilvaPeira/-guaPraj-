"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { normalizarChavePix } from "@/lib/pix";

export type EstadoPix = { erro?: string; ok?: string };

/** Chave Pix da loja: mostrada ao cliente que escolhe "Pix" para pagar na entrega/retirada. */
export async function salvarPix(_: EstadoPix, form: FormData): Promise<EstadoPix> {
  const { loja, db } = await exigirLoja();
  if (form.get("acao") === "remover") {
    await db.update(schema.lojas).set({ pixChave: null, pixTipo: null, pixNome: null }).where(eq(schema.lojas.id, loja.id));
    revalidatePath("/loja/pagamentos");
    return { ok: "Chave Pix removida." };
  }
  const tipo = String(form.get("tipo") ?? "");
  const r = normalizarChavePix(tipo, String(form.get("chave") ?? ""));
  if (!r.ok) return { erro: r.erro };
  const nome = String(form.get("nome") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  if (nome.length < 3) return { erro: "Informe o nome de quem recebe (como aparece no banco)." };
  await db.update(schema.lojas).set({ pixChave: r.chave, pixTipo: tipo, pixNome: nome }).where(eq(schema.lojas.id, loja.id));
  revalidatePath("/loja/pagamentos");
  return { ok: "Chave Pix salva. Quem escolher Pix vê a chave e o Pix copia e cola com o valor do pedido." };
}
