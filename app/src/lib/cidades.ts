import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Cidade = { nome: string; uf: string; lat: number; lng: number };

/** Cidades atendidas, na ordem do painel. `todas` inclui as desativadas (só o admin usa). */
export async function listarCidades(todas = false) {
  const db = await getDb();
  return db
    .select()
    .from(schema.cidades)
    .where(todas ? undefined : eq(schema.cidades.ativa, true))
    .orderBy(asc(schema.cidades.ordem), asc(schema.cidades.nome));
}

/** Para os formulários de endereço (cliente e loja). */
export async function cidadesParaEndereco(): Promise<Cidade[]> {
  return (await listarCidades()).map(({ nome, uf, lat, lng }) => ({ nome, uf, lat, lng }));
}

/** A cidade escolhida está entre as atendidas? Devolve a mensagem de erro, ou null se está tudo certo. */
export async function erroCidade(nome: string): Promise<string | null> {
  const db = await getDb();
  const [c] = await db
    .select({ id: schema.cidades.id })
    .from(schema.cidades)
    .where(and(eq(schema.cidades.nome, nome), eq(schema.cidades.ativa, true)))
    .limit(1);
  return c ? null : `Ainda não atendemos ${nome || "essa cidade"}. Escolha uma das cidades da lista.`;
}
