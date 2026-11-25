"use server";

import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { normalizarTelefone } from "@/lib/telefone";
import { criarTokenSenha } from "@/lib/otp";
import { urlBase } from "@/lib/url";
import { PLANOS_APP_SUGERIDOS } from "@/lib/planos-app";
import { agoraLocal } from "@/lib/tempo";

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
  revalidatePath("/admin/lojas");
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

// ───────────── Planos do app ─────────────

export type EstadoPlanoApp = { erro?: string; ok?: string };

const reaisParaCentavos = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const limite = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  if (!t) return null; // vazio = ilimitado
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

export async function salvarPlanoApp(_: EstadoPlanoApp, form: FormData): Promise<EstadoPlanoApp> {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim().slice(0, 40);
  const preco = reaisParaCentavos(form.get("preco"));
  const limiteAssinantes = limite(form.get("limiteAssinantes"));
  const limiteEntregadores = limite(form.get("limiteEntregadores"));
  if (nome.length < 2) return { erro: "Dê um nome ao plano." };
  if (preco === null) return { erro: "Preço inválido." };
  if (limiteAssinantes === undefined || limiteEntregadores === undefined) return { erro: "Limites devem ser números inteiros (ou vazio para ilimitado)." };
  const valores = {
    nome,
    precoCentavos: preco,
    descricao: String(form.get("descricao") ?? "").trim().slice(0, 200) || null,
    limiteAssinantes,
    limiteEntregadores,
    pagamentoOnline: form.get("pagamentoOnline") === "on",
    produtosExtras: form.get("produtosExtras") === "on",
    appProprio: form.get("appProprio") === "on",
    ordem: Number(form.get("ordem")) || 0,
  };
  const db = await getDb();
  if (/^[0-9a-f-]{36}$/.test(id)) {
    await db.update(schema.planosApp).set(valores).where(eq(schema.planosApp.id, id));
  } else {
    await db.insert(schema.planosApp).values(valores);
  }
  revalidatePath("/admin/planos");
  return { ok: "Plano salvo." };
}

export async function acaoPlanoApp(form: FormData) {
  await exigirUsuario(["admin"]);
  const id = String(form.get("id") ?? "");
  const acao = String(form.get("acao") ?? "");
  const db = await getDb();
  if (acao === "sugeridos") {
    const [r] = await db.select({ n: count() }).from(schema.planosApp);
    if (!r?.n) await db.insert(schema.planosApp).values(PLANOS_APP_SUGERIDOS);
  } else if (/^[0-9a-f-]{36}$/.test(id) && acao === "alternar") {
    const [p] = await db.select().from(schema.planosApp).where(eq(schema.planosApp.id, id)).limit(1);
    if (p) await db.update(schema.planosApp).set({ ativo: !p.ativo }).where(eq(schema.planosApp.id, id));
  } else if (/^[0-9a-f-]{36}$/.test(id) && acao === "excluir") {
    const [r] = await db.select({ n: count() }).from(schema.lojas).where(eq(schema.lojas.planoAppId, id));
    if (!r?.n) await db.delete(schema.planosApp).where(eq(schema.planosApp.id, id));
  }
  revalidatePath("/admin/planos");
}

// ───────────── Plano de cada loja ─────────────

export type EstadoPlanoLoja = { erro?: string; ok?: string };

export async function definirPlanoLoja(_: EstadoPlanoLoja, form: FormData): Promise<EstadoPlanoLoja> {
  await exigirUsuario(["admin"]);
  const lojaId = String(form.get("lojaId") ?? "");
  const planoId = String(form.get("planoId") ?? "");
  const pagoAte = String(form.get("pagoAte") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(lojaId)) return { erro: "Loja inválida." };
  if (pagoAte && !/^\d{4}-\d{2}-\d{2}$/.test(pagoAte)) return { erro: "Data inválida." };
  const db = await getDb();
  await db
    .update(schema.lojas)
    .set({ planoAppId: /^[0-9a-f-]{36}$/.test(planoId) ? planoId : null, planoAppPagoAte: pagoAte || null })
    .where(eq(schema.lojas.id, lojaId));
  revalidatePath("/admin/lojas");
  revalidatePath("/admin");
  return { ok: "Plano da loja salvo." };
}

/** Pagamento recebido: estende o plano por 1 mês (a partir do vencimento ou de hoje). */
export async function registrarMensalidade(form: FormData) {
  await exigirUsuario(["admin"]);
  const lojaId = String(form.get("lojaId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(lojaId)) return;
  const db = await getDb();
  const [l] = await db.select({ pagoAte: schema.lojas.planoAppPagoAte }).from(schema.lojas).where(eq(schema.lojas.id, lojaId)).limit(1);
  if (!l) return;
  const hoje = agoraLocal().data;
  const base = l.pagoAte && l.pagoAte >= hoje ? l.pagoAte : hoje;
  await db.update(schema.lojas).set({ planoAppPagoAte: somarMes(base) }).where(eq(schema.lojas.id, lojaId));
  revalidatePath("/admin/lojas");
  revalidatePath("/admin");
}

function somarMes(data: string): string {
  const [a, m, d] = data.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m + 1, 0)).getUTCDate(); // último dia do mês seguinte
  const alvo = new Date(Date.UTC(a, m, Math.min(d, ultimoDia)));
  return alvo.toISOString().slice(0, 10);
}
