"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { esquemaEndereco, primeiroErro } from "@/lib/validacao";

export type EstadoForm = { erro?: string };

const esquema = esquemaEndereco.extend({
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  termos: z.literal("on", { message: "Aceite os termos de uso para continuar." }),
});

export async function salvarCadastro(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const r = esquema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: primeiroErro(r.error) };
  const d = r.data;
  const db = await getDb();

  await db
    .update(schema.usuarios)
    .set({ nome: d.nome, aceitouTermosEm: u.aceitouTermosEm ?? new Date() })
    .where(eq(schema.usuarios.id, u.id));

  const [existente] = await db
    .select({ id: schema.enderecos.id })
    .from(schema.enderecos)
    .where(and(eq(schema.enderecos.usuarioId, u.id), eq(schema.enderecos.padrao, true)))
    .limit(1);

  const valores = {
    logradouro: d.logradouro,
    numero: d.numero,
    complemento: d.complemento,
    bairro: d.bairro,
    cidade: d.cidade,
    referencia: d.referencia,
    lat: d.lat,
    lng: d.lng,
  };
  if (existente) {
    await db.update(schema.enderecos).set(valores).where(eq(schema.enderecos.id, existente.id));
  } else {
    await db.insert(schema.enderecos).values({ ...valores, usuarioId: u.id, padrao: true });
  }
  redirect("/inicio");
}
