import "server-only";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "./sessao";

/** Exige cliente com cadastro completo; devolve usuário + endereço padrão. */
export async function exigirCliente() {
  const u = await exigirUsuario(["cliente"]);
  const db = await getDb();
  const [endereco] = await db
    .select()
    .from(schema.enderecos)
    .where(and(eq(schema.enderecos.usuarioId, u.id), eq(schema.enderecos.padrao, true)))
    .limit(1);
  if (!u.nome || !endereco) redirect("/cadastro");
  return { usuario: u, endereco, db };
}
