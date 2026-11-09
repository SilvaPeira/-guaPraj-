import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Usuario } from "./sessao";

/** Para onde mandar o usuário depois do login (ou ao abrir a raiz). */
export async function destinoDoUsuario(u: Usuario, intencao?: string | null): Promise<string> {
  if (u.papel === "admin") return "/admin";
  if (u.papel === "loja") return "/loja";
  if (u.papel === "entregador") return "/entregas";
  if (intencao === "loja") return "/loja/cadastro";
  if (!u.nome) return "/cadastro";
  const db = await getDb();
  const [end] = await db
    .select({ id: schema.enderecos.id })
    .from(schema.enderecos)
    .where(eq(schema.enderecos.usuarioId, u.id))
    .limit(1);
  return end ? "/inicio" : "/cadastro";
}

export function telefonesAdmin(): string[] {
  return (process.env.ADMIN_TELEFONES ?? "")
    .split(",")
    .map((t) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .filter(Boolean);
}
