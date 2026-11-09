"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";

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
}
