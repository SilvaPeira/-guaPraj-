import "server-only";
import webpush from "web-push";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { enviarWhatsApp } from "./mensagens";
import { urlLegivel } from "./dominio";

/**
 * Avisos para cliente e loja, por três caminhos (nenhum derruba a operação se falhar):
 *  1. histórico dentro do app (/avisos) — sempre;
 *  2. notificação no celular/computador (Web Push) — nos aparelhos que aceitaram; grátis, sem provedor;
 *  3. WhatsApp — quando houver provedor configurado (WHATSAPP_PROVEDOR).
 *
 * Web Push precisa das chaves VAPID (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Sem elas, só 1 e 3.
 * Gerar: npx web-push generate-vapid-keys
 */

export type Aviso = { titulo: string; texto: string; link?: string | null };

export function chavePublicaPush(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

let configurado = false;
function pushLigado(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configurado) {
    const contato = process.env.VAPID_CONTATO || (process.env.APP_URL ?? "https://xn--guapraj-gwah.tech");
    webpush.setVapidDetails(contato, pub, priv);
    configurado = true;
  }
  return true;
}

/** Envia a notificação para todos os aparelhos do usuário; remove os que não existem mais. */
async function enviarPush(usuarioId: string, a: Aviso): Promise<number> {
  if (!pushLigado()) return 0;
  const db = await getDb();
  const inscricoes = await db.select().from(schema.inscricoesPush).where(eq(schema.inscricoesPush.usuarioId, usuarioId));
  const corpo = JSON.stringify({ titulo: a.titulo, texto: a.texto, link: a.link ?? "/" });
  let ok = 0;
  await Promise.allSettled(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, { TTL: 24 * 3600, urgency: "high" });
        ok++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: o aparelho cancelou ou a inscrição venceu.
        if (status === 404 || status === 410) await db.delete(schema.inscricoesPush).where(eq(schema.inscricoesPush.id, i.id));
        else console.error("[push] falhou", status ?? (e as Error).message);
      }
    }),
  );
  return ok;
}

/** Guarda o aviso no app e manda notificação + WhatsApp. `telefone` é para o WhatsApp (o da loja pode ser outro). */
export async function notificar(usuarioId: string | null, a: Aviso, telefone?: string | null): Promise<void> {
  try {
    if (usuarioId) {
      const db = await getDb();
      await db.insert(schema.avisos).values({ usuarioId, titulo: a.titulo.slice(0, 120), texto: a.texto.slice(0, 500), link: a.link ?? null });
      await enviarPush(usuarioId, a);
    }
  } catch (e) {
    console.error("[avisos] falha no aviso do app", e);
  }
  if (telefone) {
    const link = a.link ? ` ${urlLegivel((process.env.APP_URL ?? "").replace(/\/$/, ""))}${a.link}` : "";
    await enviarWhatsApp(telefone, `${a.texto}${link}`).catch((e) => console.error("[avisos] whatsapp", e));
  }
}

/** Avisos do usuário, mais novos primeiro. */
export async function avisosDe(usuarioId: string, limite = 50) {
  const db = await getDb();
  return db.select().from(schema.avisos).where(eq(schema.avisos.usuarioId, usuarioId)).orderBy(desc(schema.avisos.criadoEm)).limit(limite);
}

export async function naoLidos(usuarioId: string): Promise<number> {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.avisos)
    .where(and(eq(schema.avisos.usuarioId, usuarioId), isNull(schema.avisos.lidoEm)));
  return r?.n ?? 0;
}

export async function marcarLidos(usuarioId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.avisos)
    .set({ lidoEm: new Date() })
    .where(and(eq(schema.avisos.usuarioId, usuarioId), isNull(schema.avisos.lidoEm)));
}

/** Guarda (ou atualiza) o aparelho que aceitou notificação. */
export async function inscrever(usuarioId: string, s: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> {
  const db = await getDb();
  await db
    .insert(schema.inscricoesPush)
    .values({ usuarioId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth })
    .onConflictDoUpdate({ target: schema.inscricoesPush.endpoint, set: { usuarioId, p256dh: s.keys.p256dh, auth: s.keys.auth } });
}

export async function desinscrever(usuarioId: string, endpoint: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.inscricoesPush).where(and(eq(schema.inscricoesPush.usuarioId, usuarioId), eq(schema.inscricoesPush.endpoint, endpoint)));
}
