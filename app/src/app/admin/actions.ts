"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { normalizarTelefone } from "@/lib/telefone";
import { criarTokenSenha } from "@/lib/otp";
import { urlBase } from "@/lib/url";

export async function mudarStatusLoja(form: FormData) {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["aprovada", "suspensa", "pendente"].includes(status) || !/^[0-9a-f-]{36}$/.test(id)) return;
  const obs = String(form.get("observacao") ?? "").trim().slice(0, 300) || null;
  const db = await getDb();
  await db
    .update(schema.lojas)
    .set({ status: status as "aprovada" | "suspensa" | "pendente", observacaoAdmin: obs })
    .where(eq(schema.lojas.id, id));
  revalidatePath("/admin");
}

export type EstadoLinkSenha = { erro?: string; link?: string; telefone?: string };

/** Gera um link de uso único (24 h) para a pessoa criar uma senha nova. */
export async function gerarLinkSenha(_: EstadoLinkSenha, form: FormData): Promise<EstadoLinkSenha> {
  await exigirUsuario(["admin"]);
  const telefone = normalizarTelefone(String(form.get("telefone") ?? ""));
  if (!telefone) return { erro: "Celular inválido." };
  const db = await getDb();
  const [u] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.telefone, telefone)).limit(1);
  if (!u) return { erro: "Não há conta com este celular." };
  const token = await criarTokenSenha(telefone);
  return { telefone, link: `${await urlBase()}/entrar/nova-senha?tel=${telefone}&t=${token}` };
}
