import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { recursosDaLoja } from "./planos-app";

// Etapa 6 — pagamento online pelo Mercado Pago.
//
// Cada distribuidora conecta a PRÓPRIA conta Mercado Pago (OAuth do modelo
// "marketplace"): o dinheiro cai direto na conta dela e, se houver taxa da
// plataforma (TAXA_PLATAFORMA_PERCENTUAL), o Mercado Pago separa essa parte
// para a conta do ÁguaPrajá (split com marketplace_fee).
//
// Modos:
//  - "real":      MP_CLIENT_ID e MP_CLIENT_SECRET configurados.
//  - "simulado":  só em desenvolvimento, sem credenciais. Uma tela de teste
//                 aprova/recusa o pagamento — exercita o fluxo inteiro.
//  - "desligado": produção sem credenciais. Só "pagar na entrega".

const API = "https://api.mercadopago.com";

export type ModoPagamento = "real" | "simulado" | "desligado";

export function modoPagamento(): ModoPagamento {
  if (process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET) return "real";
  if (process.env.NODE_ENV !== "production") return "simulado";
  // Testes ponta a ponta rodam o build de produção no próprio computador: nunca vale em domínio público.
  if (process.env.E2E_PAGAMENTO_SIMULADO === "1" && /^http:\/\/localhost:\d+$/.test(process.env.APP_URL ?? "")) return "simulado";
  return "desligado";
}

export class ErroPagamento extends Error {}

// ───────────── Cifra dos tokens (AES-256-GCM, chave derivada do SESSION_SECRET) ─────────────

function chave(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não configurada");
  return createHash("sha256")
    .update(`${s ?? "dev-apenas-local-nao-usar-em-producao"}|mercadopago`)
    .digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64url")).join(".");
}

export function decifrar(cifrado: string): string {
  const [iv, tag, dados] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

// ───────────── Conexão da conta da loja (OAuth) ─────────────

/** "state" do OAuth: amarra o retorno à loja e expira em 1 hora. */
export function estadoOAuth(lojaId: string, agora = Date.now()): string {
  const base = `${lojaId}.${agora}`;
  return `${base}.${createHmac("sha256", chave()).update(base).digest("base64url")}`;
}

export function lerEstadoOAuth(estado: string, agora = Date.now()): string | null {
  const [lojaId, ts, sig] = estado.split(".");
  if (!lojaId || !ts || !sig) return null;
  const esperado = createHmac("sha256", chave()).update(`${lojaId}.${ts}`).digest();
  const recebido = Buffer.from(sig, "base64url");
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null;
  if (agora - Number(ts) > 3600_000) return null;
  return lojaId;
}

export function urlConectar(lojaId: string, base: string): string {
  const q = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id: "mp",
    state: estadoOAuth(lojaId),
    redirect_uri: `${base}/api/mercadopago/retorno`,
  });
  return `https://auth.mercadopago.com.br/authorization?${q}`;
}

type RespostaToken = { access_token: string; refresh_token?: string; public_key?: string; user_id: number | string; expires_in?: number };

async function pedirToken(corpo: Record<string, string>): Promise<RespostaToken> {
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: process.env.MP_CLIENT_ID, client_secret: process.env.MP_CLIENT_SECRET, ...corpo }),
    cache: "no-store",
  });
  if (!r.ok) throw new ErroPagamento(`Mercado Pago recusou a conexão (${r.status}).`);
  return (await r.json()) as RespostaToken;
}

async function salvarConta(lojaId: string, t: RespostaToken) {
  const db = await getDb();
  const valores = {
    mpUserId: String(t.user_id),
    accessToken: cifrar(t.access_token),
    refreshToken: t.refresh_token ? cifrar(t.refresh_token) : null,
    publicKey: t.public_key ?? null,
    expiraEm: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
  };
  await db
    .insert(schema.contasMercadoPago)
    .values({ lojaId, ...valores })
    .onConflictDoUpdate({ target: schema.contasMercadoPago.lojaId, set: valores });
}

/** Troca o código do OAuth pelos tokens da loja e guarda a conexão. */
export async function concluirConexao(lojaId: string, code: string, base: string): Promise<void> {
  const t = await pedirToken({ grant_type: "authorization_code", code, redirect_uri: `${base}/api/mercadopago/retorno` });
  await salvarConta(lojaId, t);
}

/** Desenvolvimento: conecta uma conta de mentira para testar o fluxo. */
export async function conectarSimulado(lojaId: string): Promise<void> {
  if (modoPagamento() !== "simulado") throw new ErroPagamento("Disponível só no modo de teste.");
  await salvarConta(lojaId, { access_token: "SIMULADO", user_id: "simulado" });
}

export async function desconectar(lojaId: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.contasMercadoPago).where(eq(schema.contasMercadoPago.lojaId, lojaId));
}

export async function contaDaLoja(lojaId: string) {
  const db = await getDb();
  const [c] = await db
    .select({ mpUserId: schema.contasMercadoPago.mpUserId, conectadoEm: schema.contasMercadoPago.conectadoEm })
    .from(schema.contasMercadoPago)
    .where(eq(schema.contasMercadoPago.lojaId, lojaId))
    .limit(1);
  return c ?? null;
}

/** A loja aceita pagamento pelo app? (conta conectada e pagamento ligado na plataforma) */
export async function aceitaOnline(lojaId: string): Promise<boolean> {
  if (modoPagamento() === "desligado") return false;
  if (!(await recursosDaLoja(lojaId)).pagamentoOnline) return false;
  const c = await contaDaLoja(lojaId);
  if (!c) return false;
  // Conta simulada não vale com credenciais reais (e vice-versa).
  return (c.mpUserId === "simulado") === (modoPagamento() === "simulado");
}

/** Token de acesso da loja, renovado automaticamente quando falta pouco para vencer. */
async function tokenDaLoja(lojaId: string): Promise<string> {
  const db = await getDb();
  const [c] = await db.select().from(schema.contasMercadoPago).where(eq(schema.contasMercadoPago.lojaId, lojaId)).limit(1);
  if (!c) throw new ErroPagamento("Esta loja ainda não recebe pagamentos pelo app.");
  const faltaPouco = c.expiraEm && c.expiraEm.getTime() - Date.now() < 15 * 24 * 3600_000;
  if (faltaPouco && c.refreshToken && modoPagamento() === "real") {
    try {
      const t = await pedirToken({ grant_type: "refresh_token", refresh_token: decifrar(c.refreshToken) });
      await salvarConta(lojaId, t);
      return t.access_token;
    } catch (e) {
      console.error("[mercadopago] não renovou o token da loja", lojaId, e);
    }
  }
  return decifrar(c.accessToken);
}

async function api<T>(token: string, caminho: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API}${caminho}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!r.ok) throw new ErroPagamento(`Mercado Pago respondeu ${r.status} em ${caminho.split("?")[0]}.`);
  return (await r.json()) as T;
}

// ───────────── Cobrança ─────────────

export function taxaPlataforma(totalCentavos: number): number {
  const p = Number(process.env.TAXA_PLATAFORMA_PERCENTUAL ?? 0);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round((totalCentavos * Math.min(p, 50)) / 100);
}

const FINAIS_SEM_COBRANCA = ["cancelado", "nao_entregue"] as const;

export function podePagarOnline(p: { totalCentavos: number; statusPagamento: string; status: string }): boolean {
  return p.totalCentavos > 0 && (p.statusPagamento === "pendente" || p.statusPagamento === "falhou") && !(FINAIS_SEM_COBRANCA as readonly string[]).includes(p.status);
}

/**
 * Cria a cobrança (Checkout Pro: Pix ou cartão) e devolve o link de pagamento.
 * Só o próprio cliente do pedido pode gerar.
 */
export async function criarCobranca(pedidoId: string, clienteId: string, base: string): Promise<string> {
  const db = await getDb();
  const [linha] = await db
    .select({ p: schema.pedidos, loja: { id: schema.lojas.id, nome: schema.lojas.nome } })
    .from(schema.pedidos)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
    .where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.clienteId, clienteId)))
    .limit(1);
  if (!linha) throw new ErroPagamento("Pedido não encontrado.");
  const { p, loja } = linha;
  if (!podePagarOnline(p)) throw new ErroPagamento(p.statusPagamento === "pago" ? "Este pedido já está pago." : "Este pedido não tem nada a pagar.");
  if (!(await aceitaOnline(loja.id))) throw new ErroPagamento("Esta loja ainda não recebe pagamentos pelo app. Pague na entrega.");

  if (modoPagamento() === "simulado") return `${base}/pagamento-simulado/${p.id}`;

  const token = await tokenDaLoja(loja.id);
  const voltar = `${base}/pedidos/${p.id}?pagamento=retorno`;
  const taxa = taxaPlataforma(p.totalCentavos);
  const pref = await api<{ init_point: string }>(token, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: p.id, title: `Pedido #${p.numero} · ${loja.nome}`, quantity: 1, unit_price: p.totalCentavos / 100, currency_id: "BRL" }],
      external_reference: p.id,
      notification_url: `${base}/api/mercadopago/webhook?loja=${loja.id}`,
      back_urls: { success: voltar, pending: voltar, failure: voltar },
      auto_return: "approved",
      // Boleto não combina com entrega no mesmo dia: só Pix e cartão.
      // Abre só no meio que o cliente escolheu (Pix = bank_transfer no Mercado Pago).
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" },
          { id: "atm" },
          ...(linha.p.meioEscolhido === "pix" ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "prepaid_card" }] : []),
          ...(linha.p.meioEscolhido === "cartao" ? [{ id: "bank_transfer" }] : []),
        ],
        installments: 1,
      },
      ...(taxa > 0 ? { marketplace_fee: taxa / 100 } : {}),
    }),
  });
  return pref.init_point;
}

// ───────────── Confirmação (webhook) e estorno ─────────────

export type MeioPago = "pix" | "cartao";

type PagamentoMP = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number;
  payment_method_id?: string;
  payment_type_id?: string;
};

export type ResultadoConfirmacao = { pedidoId: string; agoraPago: boolean } | null;

/** Grava o pagamento aprovado. Idempotente: devolve agoraPago=false se já estava pago. */
export async function registrarPago(pedidoId: string, pagamentoId: string, meio: MeioPago): Promise<boolean> {
  const db = await getDb();
  const r = await db
    .update(schema.pedidos)
    .set({ statusPagamento: "pago", formaPagamento: "online", pagamentoId, pagamentoMeio: meio, pagoEm: new Date() })
    .where(and(eq(schema.pedidos.id, pedidoId), ne(schema.pedidos.statusPagamento, "pago"), ne(schema.pedidos.statusPagamento, "estornado")))
    .returning({ id: schema.pedidos.id });
  return r.length > 0;
}

/** Consulta o pagamento na conta da loja e atualiza o pedido (nunca confia só no aviso recebido). */
export async function processarPagamento(lojaId: string, pagamentoId: string): Promise<ResultadoConfirmacao> {
  if (!/^\d{1,20}$/.test(pagamentoId)) return null;
  const token = await tokenDaLoja(lojaId);
  const pg = await api<PagamentoMP>(token, `/v1/payments/${pagamentoId}`);
  const pedidoId = pg.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/.test(pedidoId)) return null;

  const db = await getDb();
  const [p] = await db
    .select()
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.lojaId, lojaId)))
    .limit(1);
  if (!p) return null;

  if (pg.status === "approved") {
    if (Math.round((pg.transaction_amount ?? 0) * 100) < p.totalCentavos) {
      console.error("[mercadopago] valor pago menor que o pedido", pedidoId, pg.transaction_amount);
      return { pedidoId, agoraPago: false };
    }
    const meio: MeioPago = pg.payment_method_id === "pix" || pg.payment_type_id === "bank_transfer" ? "pix" : "cartao";
    return { pedidoId, agoraPago: await registrarPago(pedidoId, String(pg.id), meio) };
  }
  if (pg.status === "refunded" || pg.status === "charged_back") {
    await db.update(schema.pedidos).set({ statusPagamento: "estornado" }).where(eq(schema.pedidos.id, pedidoId));
  } else if ((pg.status === "rejected" || pg.status === "cancelled") && p.statusPagamento === "pendente") {
    await db.update(schema.pedidos).set({ statusPagamento: "falhou" }).where(eq(schema.pedidos.id, pedidoId));
  }
  return { pedidoId, agoraPago: false };
}

export const AVISO_ESTORNO_FALHOU = "estorno automático falhou: devolva o valor pelo Mercado Pago";

/**
 * Pedido pago pelo app e depois cancelado: devolve o dinheiro ao cliente.
 * Nunca derruba o cancelamento — se o estorno falhar, fica registrado para a loja resolver.
 */
export async function estornarCancelados(pedidoIds: string[]): Promise<void> {
  if (!pedidoIds.length) return;
  const db = await getDb();
  const pagos = await db
    .select()
    .from(schema.pedidos)
    .where(and(inArray(schema.pedidos.id, pedidoIds), eq(schema.pedidos.status, "cancelado"), eq(schema.pedidos.statusPagamento, "pago"), eq(schema.pedidos.formaPagamento, "online")));
  for (const p of pagos) {
    try {
      if (!p.pagamentoId?.startsWith("sim-")) {
        const token = await tokenDaLoja(p.lojaId);
        await api(token, `/v1/payments/${p.pagamentoId}/refunds`, { method: "POST", body: "{}", headers: { "x-idempotency-key": `estorno-${p.id}` } });
      }
      await db.update(schema.pedidos).set({ statusPagamento: "estornado" }).where(eq(schema.pedidos.id, p.id));
    } catch (e) {
      console.error("[mercadopago] estorno falhou", p.id, e);
      await db
        .update(schema.pedidos)
        .set({ motivo: `${p.motivo ?? "Cancelado"} · ${AVISO_ESTORNO_FALHOU}` })
        .where(eq(schema.pedidos.id, p.id));
    }
  }
}

/**
 * Confere a assinatura do aviso (cabeçalho x-signature) quando MP_WEBHOOK_SECRET existe.
 * Mesmo sem ela o aviso é seguro: o pagamento é sempre consultado na API.
 */
export function assinaturaValida(cabecalho: string | null, requestId: string | null, dataId: string, segredo = process.env.MP_WEBHOOK_SECRET): boolean {
  if (!segredo) return true;
  if (!cabecalho) return false;
  const partes = Object.fromEntries(cabecalho.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifesto = `id:${id};${requestId ? `request-id:${requestId};` : ""}ts:${partes.ts};`;
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
