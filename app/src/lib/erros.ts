import "server-only";
import { desc, gte, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const DIAS_GUARDADOS = 30;

/** Guarda um erro do servidor. Nunca lança (um erro ao registrar erro não pode derrubar nada). */
export async function registrarErro(e: { mensagem: string; rota: string; metodo?: string; tipo?: string; digest?: string }): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(schema.errosServidor).values({
      mensagem: e.mensagem.slice(0, 500),
      // Sem a parte depois do "?" (links de senha levam token ali).
      rota: e.rota.split("?")[0].slice(0, 200),
      metodo: e.metodo?.slice(0, 10) ?? null,
      tipo: e.tipo?.slice(0, 20) ?? null,
      digest: e.digest?.slice(0, 40) ?? null,
    });
    // Faxina de vez em quando: só os últimos 30 dias.
    if (Math.random() < 0.05) {
      await db.delete(schema.errosServidor).where(lt(schema.errosServidor.criadoEm, new Date(Date.now() - DIAS_GUARDADOS * 86400_000)));
    }
  } catch (falha) {
    console.error("[erros] não registrou", falha);
  }
}

export async function errosRecentes(horas = 24): Promise<number> {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.errosServidor)
    .where(gte(schema.errosServidor.criadoEm, new Date(Date.now() - horas * 3600_000)));
  return r?.n ?? 0;
}

/** Erros agrupados pela mensagem + rota, os mais recentes primeiro. */
export async function errosAgrupados(limite = 50) {
  const db = await getDb();
  return db
    .select({
      mensagem: schema.errosServidor.mensagem,
      rota: schema.errosServidor.rota,
      tipo: schema.errosServidor.tipo,
      vezes: sql<number>`count(*)::int`,
      ultimo: sql<Date>`max(${schema.errosServidor.criadoEm})`,
      digest: sql<string | null>`max(${schema.errosServidor.digest})`,
    })
    .from(schema.errosServidor)
    .groupBy(schema.errosServidor.mensagem, schema.errosServidor.rota, schema.errosServidor.tipo)
    .orderBy(desc(sql`max(${schema.errosServidor.criadoEm})`))
    .limit(limite);
}
