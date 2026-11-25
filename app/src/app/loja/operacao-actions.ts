"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { ErroPedido } from "@/lib/pedidos";
import { exigirOperador, mudarStatus, reagendar, registrarCasco } from "@/lib/operacao";
import { normalizarTelefone } from "@/lib/telefone";
import { avisarCliente, avisarVarios, type Evento } from "@/lib/avisos";
import type { StatusPedido } from "@/lib/status";
import { entregadoresDaLoja, recursosDaLoja } from "@/lib/planos-app";

export type EstadoOperacao = { erro?: string; ok?: string };

const STATUS: StatusPedido[] = ["confirmado", "separacao", "saiu", "entregue", "pronto_retirada", "retirado", "nao_entregue", "cancelado"];
// O entregador só mexe no que acontece na rua.
const DO_ENTREGADOR: StatusPedido[] = ["saiu", "entregue", "nao_entregue"];

function atualizarTelas() {
  revalidatePath("/loja");
  revalidatePath("/entregas");
}

export async function mudarStatusAcao(_: EstadoOperacao, form: FormData): Promise<EstadoOperacao> {
  const { usuario, loja, ehDono } = await exigirOperador();
  const novo = String(form.get("novo") ?? "") as StatusPedido;
  if (!STATUS.includes(novo)) return { erro: "Ação inválida." };
  if (!ehDono && !DO_ENTREGADOR.includes(novo)) return { erro: "Só a loja pode fazer isso." };
  const ids = form.getAll("pedidoId").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  if (!ids.length) return { erro: "Selecione pelo menos um pedido." };
  const recolhidos = form.get("cascosRecolhidos");
  const cascosBebida: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("cascoBebida:") && /^[0-9a-f-]{36}$/.test(k.slice(12))) cascosBebida[k.slice(12)] = Math.max(0, Number(v) || 0);
  }
  try {
    const mudaram = await mudarStatus(loja.id, usuario.id, ids, novo, {
      cascosRecolhidos: recolhidos === null ? undefined : Number(recolhidos),
      cascosBebida: Object.keys(cascosBebida).length ? cascosBebida : undefined,
      documentoConferido: form.get("documentoConferido") === "on",
      pagamentoRecebido: form.get("pagamentoRecebido") !== "nao",
      motivo: String(form.get("motivo") ?? "").trim().slice(0, 120) || undefined,
      codigoRetirada: form.get("codigoRetirada") === null ? undefined : String(form.get("codigoRetirada")).trim(),
    });
    atualizarTelas();
    if (novo !== "separacao" && novo !== "recebido") await avisarVarios(mudaram, novo as Evento);
    return { ok: ids.length > 1 ? `${mudaram.length} de ${ids.length} pedidos atualizados.` : "Atualizado." };
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
}

export async function reagendarAcao(_: EstadoOperacao, form: FormData): Promise<EstadoOperacao> {
  const { usuario, loja } = await exigirOperador();
  try {
    await reagendar(loja.id, usuario.id, String(form.get("pedidoId")), String(form.get("data")));
    atualizarTelas();
    await avisarCliente(String(form.get("pedidoId")), "reagendado");
    return { ok: "Reagendado." };
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
}

export async function cascoAcao(form: FormData) {
  const { loja, ehDono } = await exigirOperador();
  if (!ehDono) return;
  const delta = Number(form.get("delta"));
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 50) return;
  await registrarCasco(loja.id, String(form.get("clienteId")), delta, delta < 0 ? "Devolvido na loja" : "Ajuste da loja");
  revalidatePath("/loja/cascos");
}

// ───────── Equipe (entregadores) ─────────

export async function adicionarEntregador(_: EstadoOperacao, form: FormData): Promise<EstadoOperacao> {
  const { loja, db, ehDono } = await exigirOperador();
  if (!ehDono) return { erro: "Só a loja pode cadastrar entregadores." };
  const telefone = normalizarTelefone(String(form.get("telefone") ?? ""));
  const nome = String(form.get("nome") ?? "").trim().slice(0, 60);
  if (!telefone) return { erro: "Celular inválido." };
  if (nome.length < 2) return { erro: "Informe o nome do entregador." };
  const { limiteEntregadores } = await recursosDaLoja(loja.id);
  if (limiteEntregadores !== null && (await entregadoresDaLoja(loja.id)) >= limiteEntregadores) {
    return { erro: `Seu plano do ÁguaPrajá permite ${limiteEntregadores} entregador(es). Mude de plano em Ajustes → Meu plano para cadastrar mais.` };
  }
  let [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.telefone, telefone)).limit(1);
  if (u && u.papel !== "entregador") {
    return { erro: "Esse celular já tem cadastro como cliente ou loja. Use outro número para o entregador." };
  }
  if (!u) [u] = await db.insert(schema.usuarios).values({ telefone, nome, papel: "entregador" }).returning();
  await db.insert(schema.entregadores).values({ lojaId: loja.id, usuarioId: u.id }).onConflictDoNothing();
  revalidatePath("/loja/equipe");
  return { ok: `${nome} cadastrado. Ele entra no app com esse celular e vê as entregas do dia.` };
}

export async function removerEntregador(form: FormData) {
  const { loja, db, ehDono } = await exigirOperador();
  if (!ehDono) return;
  await db
    .delete(schema.entregadores)
    .where(and(eq(schema.entregadores.lojaId, loja.id), eq(schema.entregadores.id, String(form.get("id")))));
  revalidatePath("/loja/equipe");
}
