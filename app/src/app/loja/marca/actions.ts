"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { SLUGS_RESERVADOS, slugDe } from "@/lib/marca";
import { HEX } from "@/lib/cores";

export type EstadoMarca = { erro?: string; ok?: string };

const LOGO_MAX = 400_000; // caracteres do data URL (~300 KB de imagem)

export async function salvarMarca(_: EstadoMarca, form: FormData): Promise<EstadoMarca> {
  const { loja, db } = await exigirLoja();
  const slug = slugDe(String(form.get("slug") ?? ""));
  const corPrimaria = String(form.get("corPrimaria") ?? "");
  const corEscura = String(form.get("corEscura") ?? "");
  const descricao = String(form.get("descricao") ?? "").trim().slice(0, 200) || null;
  const logo = String(form.get("logo") ?? "");
  const removerLogo = form.get("removerLogo") === "1";

  if (slug.length < 3) return { erro: "O endereço precisa ter pelo menos 3 letras ou números." };
  if (SLUGS_RESERVADOS.has(slug)) return { erro: "Esse endereço é reservado. Escolha outro." };
  if (!HEX.test(corPrimaria) || !HEX.test(corEscura)) return { erro: "Cor inválida." };
  const [ocupado] = await db
    .select({ id: schema.lojas.id })
    .from(schema.lojas)
    .where(and(eq(schema.lojas.slug, slug), ne(schema.lojas.id, loja.id)))
    .limit(1);
  if (ocupado) return { erro: "Esse endereço já é de outra loja. Tente outro." };

  const mudanca: Partial<typeof schema.lojas.$inferInsert> = { slug, corPrimaria, corEscura, descricao };
  if (removerLogo) mudanca.logo = null;
  else if (logo) {
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logo)) return { erro: "Formato de logo inválido. Envie de novo." };
    if (logo.length > LOGO_MAX) return { erro: "A logo ficou grande demais. Tente uma imagem mais simples." };
    mudanca.logo = logo;
  }
  await db.update(schema.lojas).set(mudanca).where(eq(schema.lojas.id, loja.id));
  revalidatePath("/", "layout");
  return { ok: "Salvo! Seu site e o app já estão com a nova cara." };
}
