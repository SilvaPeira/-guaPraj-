"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizarTelefone } from "@/lib/telefone";
import { codigoDisponivel, solicitarCodigo, verificarCodigo } from "@/lib/otp";
import { criarSessao, encerrarSessao } from "@/lib/sessao";
import { destinoDoUsuario, telefonesAdmin } from "@/lib/destino";
import { definirSenha, entrarComSenha, validarSenhaNova } from "@/lib/senha";

// Entrar: celular → senha (ou criar conta com senha).
// Código pelo WhatsApp só para quem esqueceu a senha (ou conta antiga sem senha),
// e só quando há provedor de WhatsApp (ou em teste, com o código na tela).

export type EstadoLogin = {
  etapa: "telefone" | "senha" | "criar" | "codigo";
  telefone?: string;
  /** Na etapa "codigo": também cria a senha nova. */
  codigoDev?: string;
  podeCodigo?: boolean;
  erro?: string;
};

const texto = (form: FormData, k: string) => String(form.get(k) ?? "");

async function porTelefone(telefone: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.telefone, telefone)).limit(1);
  return u ?? null;
}

async function concluir(usuarioId: string, intencao: string | null): Promise<never> {
  const db = await getDb();
  let [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, usuarioId)).limit(1);
  if (telefonesAdmin().includes(u.telefone) && u.papel !== "admin") {
    [u] = await db.update(schema.usuarios).set({ papel: "admin" }).where(eq(schema.usuarios.id, u.id)).returning();
  }
  await criarSessao(u.id);
  redirect(await destinoDoUsuario(u, intencao));
}

async function mandarCodigo(telefone: string): Promise<EstadoLogin> {
  const r = await solicitarCodigo(telefone);
  if (!r.ok) return { etapa: "senha", telefone, podeCodigo: codigoDisponivel(), erro: r.erro };
  return { etapa: "codigo", telefone, codigoDev: r.codigoDev };
}

export async function entrar(anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const passo = texto(form, "passo");
  const intencao = texto(form, "intencao") || null;
  const podeCodigo = codigoDisponivel();

  if (passo === "telefone") {
    const telefone = normalizarTelefone(texto(form, "telefone"));
    if (!telefone) return { etapa: "telefone", erro: "Digite o celular com DDD, ex.: (94) 9 9999-9999." };
    const u = await porTelefone(telefone);
    if (!u) return { etapa: "criar", telefone };
    if (u.senhaHash) return { etapa: "senha", telefone, podeCodigo };
    // Conta antiga sem senha: confirma pelo código e cria a senha.
    if (podeCodigo) return mandarCodigo(telefone);
    return { etapa: "senha", telefone, podeCodigo, erro: "Esta conta ainda não tem senha. Peça ao suporte um link para criar a sua." };
  }

  const telefone = normalizarTelefone(texto(form, "telefone"));
  if (!telefone) return { etapa: "telefone", erro: "Telefone inválido." };

  if (passo === "senha") {
    const u = await porTelefone(telefone);
    if (!u) return { etapa: "criar", telefone };
    const r = await entrarComSenha(u, texto(form, "senha"));
    if (!r.ok) return { etapa: "senha", telefone, podeCodigo, erro: r.erro };
    return concluir(u.id, intencao);
  }

  if (passo === "esqueci") {
    if (!podeCodigo) return { ...anterior, etapa: "senha", telefone, podeCodigo };
    return mandarCodigo(telefone);
  }

  if (passo === "criar") {
    const erro = validarSenhaNova(texto(form, "senha"), texto(form, "confirmacao"));
    if (erro) return { etapa: "criar", telefone, erro };
    if (await porTelefone(telefone)) return { etapa: "senha", telefone, podeCodigo, erro: "Este celular já tem conta. Digite a senha." };
    const db = await getDb();
    const [u] = await db
      .insert(schema.usuarios)
      .values({ telefone, papel: telefonesAdmin().includes(telefone) ? "admin" : "cliente" })
      .onConflictDoNothing()
      .returning();
    if (!u) return { etapa: "senha", telefone, podeCodigo, erro: "Este celular já tem conta. Digite a senha." };
    await definirSenha(u.id, texto(form, "senha"));
    return concluir(u.id, intencao);
  }

  if (passo === "codigo") {
    const codigo = texto(form, "codigo").replace(/\D/g, "");
    const base = { etapa: "codigo" as const, telefone, codigoDev: anterior.codigoDev };
    if (codigo.length !== 6) return { ...base, erro: "O código tem 6 números." };
    const erro = validarSenhaNova(texto(form, "senha"), texto(form, "confirmacao"));
    if (erro) return { ...base, erro };
    const u = await porTelefone(telefone);
    if (!u || !(await verificarCodigo(telefone, codigo))) return { ...base, erro: "Código errado ou vencido. Confira ou peça outro." };
    await definirSenha(u.id, texto(form, "senha"));
    return concluir(u.id, intencao);
  }

  return { etapa: "telefone" };
}

/** Link do admin: /entrar/nova-senha?tel=…&t=… */
export async function novaSenhaPorLink(_: { erro?: string }, form: FormData): Promise<{ erro?: string }> {
  const telefone = normalizarTelefone(texto(form, "telefone"));
  const token = texto(form, "token");
  if (!telefone || !token) return { erro: "Link inválido." };
  const erro = validarSenhaNova(texto(form, "senha"), texto(form, "confirmacao"));
  if (erro) return { erro };
  const u = await porTelefone(telefone);
  if (!u || !(await verificarCodigo(telefone, token))) return { erro: "Este link já foi usado ou venceu. Peça outro ao suporte." };
  await definirSenha(u.id, texto(form, "senha"));
  return concluir(u.id, null);
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}
