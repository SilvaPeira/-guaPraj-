import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "./sessao";

export type Loja = typeof schema.lojas.$inferSelect;

/** Exige usuário dono de loja e devolve a loja dele. */
export async function exigirLoja() {
  const u = await exigirUsuario(["loja"]);
  const db = await getDb();
  const [loja] = await db.select().from(schema.lojas).where(eq(schema.lojas.donoId, u.id)).limit(1);
  if (!loja) redirect("/loja/cadastro");
  return { usuario: u, loja, db };
}
