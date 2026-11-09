"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import type { PerfilFamilia } from "@/db/schema";
import { exigirCliente } from "@/lib/cliente";
import { totalMoradores } from "@/lib/simulador";

const n = (v: FormDataEntryValue | null) => {
  const x = Number(v);
  return Number.isInteger(x) ? Math.min(20, Math.max(0, x)) : 0;
};

export async function salvarFamilia(form: FormData) {
  const { usuario, db } = await exigirCliente();
  const perfil: PerfilFamilia = {
    adultos: n(form.get("adultos")),
    criancas: n(form.get("criancas")),
    bebes: n(form.get("bebes")),
    adolescentes: n(form.get("adolescentes")),
    idosos: n(form.get("idosos")),
    calor: form.get("calor") === "on",
    cozinha: form.get("cozinha") === "on",
  };
  if (totalMoradores(perfil) === 0) return;
  await db.update(schema.usuarios).set({ perfilFamilia: perfil }).where(eq(schema.usuarios.id, usuario.id));
  redirect("/lojas");
}
