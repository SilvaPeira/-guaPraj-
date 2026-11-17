"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { schema } from "@/db";
import type { Personalizacao } from "@/db/schema";
import { exigirLoja } from "@/lib/loja";
import { SLUGS_RESERVADOS, slugDe } from "@/lib/marca";
import { CANTOS, FONTES, HEX } from "@/lib/cores";

export type EstadoMarca = { erro?: string; ok?: string };

const LOGO_MAX = 400_000; // caracteres do data URL (~300 KB)
const CAPA_MAX = 800_000; // ~600 KB

const texto = (form: FormData, campo: string, max: number) => String(form.get(campo) ?? "").trim().slice(0, max);
const corOpcional = (v: string) => (HEX.test(v) ? v : undefined);

export async function salvarMarca(_: EstadoMarca, form: FormData): Promise<EstadoMarca> {
  const { loja, db } = await exigirLoja();
  const slug = slugDe(texto(form, "slug", 60));
  const corPrimaria = texto(form, "corPrimaria", 7);
  const corEscura = texto(form, "corEscura", 7);
  if (slug.length < 3) return { erro: "O endereço precisa ter pelo menos 3 letras ou números." };
  if (SLUGS_RESERVADOS.has(slug)) return { erro: "Esse endereço é reservado. Escolha outro." };
  if (!HEX.test(corPrimaria) || !HEX.test(corEscura)) return { erro: "Cor inválida." };
  const [ocupado] = await db
    .select({ id: schema.lojas.id })
    .from(schema.lojas)
    .where(and(eq(schema.lojas.slug, slug), ne(schema.lojas.id, loja.id)))
    .limit(1);
  if (ocupado) return { erro: "Esse endereço já é de outra loja. Tente outro." };

  const fonte = texto(form, "fonte", 20);
  const cantos = texto(form, "cantos", 20);
  const instagram = texto(form, "instagram", 40).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  const personalizacao: Personalizacao = {
    corDestaque: corOpcional(texto(form, "corDestaque", 7)),
    corFundo: corOpcional(texto(form, "corFundo", 7)),
    corIcone: form.get("iconeAuto") === "on" ? undefined : corOpcional(texto(form, "corIcone", 7)),
    fonte: fonte in FONTES ? (fonte as Personalizacao["fonte"]) : undefined,
    cantos: cantos in CANTOS ? (cantos as Personalizacao["cantos"]) : undefined,
    titulo: texto(form, "titulo", 70) || undefined,
    nomeCurto: texto(form, "nomeCurto", 12) || undefined,
    instagram: instagram || undefined,
    mostrarWhatsapp: form.get("mostrarWhatsapp") === "on",
  };

  const mudanca: Partial<typeof schema.lojas.$inferInsert> = {
    slug,
    corPrimaria,
    corEscura,
    descricao: texto(form, "descricao", 200) || null,
    personalizacao,
  };
  for (const [campo, max, coluna] of [
    ["logo", LOGO_MAX, "logo"],
    ["capa", CAPA_MAX, "capa"],
  ] as const) {
    const valor = String(form.get(campo) ?? "");
    if (form.get(`remover_${campo}`) === "1") mudanca[coluna] = null;
    else if (valor) {
      if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(valor)) return { erro: `Formato de ${campo} inválido. Envie de novo.` };
      if (valor.length > max) return { erro: `A ${campo} ficou grande demais. Tente uma imagem menor.` };
      mudanca[coluna] = valor;
    }
  }
  await db.update(schema.lojas).set(mudanca).where(eq(schema.lojas.id, loja.id));
  revalidatePath("/", "layout");
  return { ok: "Salvo! Seu site e o app já estão com a nova cara." };
}
