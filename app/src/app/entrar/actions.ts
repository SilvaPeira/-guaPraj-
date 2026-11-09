"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizarTelefone } from "@/lib/telefone";
import { solicitarCodigo, verificarCodigo } from "@/lib/otp";
import { criarSessao, encerrarSessao } from "@/lib/sessao";
import { destinoDoUsuario, telefonesAdmin } from "@/lib/destino";

export type EstadoLogin = {
  etapa: "telefone" | "codigo";
  telefone?: string;
  codigoDev?: string;
  erro?: string;
};

export async function pedirCodigo(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const telefone = normalizarTelefone(String(form.get("telefone") ?? ""));
  if (!telefone) return { etapa: "telefone", erro: "Digite o celular com DDD, ex.: (94) 9 9999-9999." };
  const r = await solicitarCodigo(telefone);
  if (!r.ok) return { etapa: "telefone", erro: r.erro };
  return { etapa: "codigo", telefone, codigoDev: r.codigoDev };
}

export async function confirmarCodigo(anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const telefone = normalizarTelefone(String(form.get("telefone") ?? ""));
  const codigo = String(form.get("codigo") ?? "").replace(/\D/g, "");
  const intencao = String(form.get("intencao") ?? "") || null;
  if (!telefone) return { etapa: "telefone", erro: "Telefone inválido." };
  if (codigo.length !== 6) return { ...anterior, etapa: "codigo", telefone, erro: "O código tem 6 números." };

  const certo = await verificarCodigo(telefone, codigo);
  if (!certo) return { ...anterior, etapa: "codigo", telefone, erro: "Código errado ou vencido. Confira ou peça outro." };

  const db = await getDb();
  const ehAdmin = telefonesAdmin().includes(telefone);
  let [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.telefone, telefone)).limit(1);
  if (!u) {
    [u] = await db
      .insert(schema.usuarios)
      .values({ telefone, papel: ehAdmin ? "admin" : "cliente" })
      .returning();
  } else if (ehAdmin && u.papel !== "admin") {
    [u] = await db.update(schema.usuarios).set({ papel: "admin" }).where(eq(schema.usuarios.id, u.id)).returning();
  }

  await criarSessao(u.id);
  redirect(await destinoDoUsuario(u, intencao));
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}
