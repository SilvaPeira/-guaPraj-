"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import type { RegrasHorario } from "@/db/schema";
import { exigirLoja } from "@/lib/loja";
import { primeiroErro, reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string; ok?: string };

const hora = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.");
const marcado = z.literal("on").optional().transform((v) => v === "on");
const inteiro = (min: number, max: number, msg: string) => z.coerce.number().int(msg).min(min, msg).max(max, msg);

const esquema = z.object({
  fazEntrega: marcado,
  fazRetirada: marcado,
  raioKm: z.coerce.number().min(0.5, "Raio mínimo de 0,5 km.").max(30, "Raio máximo de 30 km."),
  taxaEntrega: z.unknown(),
  abre: hora,
  fecha: hora,
  dias: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Marque ao menos um dia."),
  aceitaImediato: marcado,
  prazoImediatoMin: inteiro(15, 240, "Prazo do imediato entre 15 e 240 minutos."),
  aceitaExato: marcado,
  janelaMinimaMin: inteiro(15, 240, "Janela mínima entre 15 e 240 minutos."),
  capacidadePorJanela: inteiro(1, 100, "Capacidade entre 1 e 100 entregas."),
  taxaExtra: z.unknown(),
  limiteAcumulo: inteiro(0, 50, "Limite de acúmulo entre 0 e 50 galões."),
  vendeAlcool: marcado,
});

export async function salvarAjustes(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { loja, db } = await exigirLoja();
  const r = esquema.safeParse({ ...Object.fromEntries(form), dias: form.getAll("dias") });
  if (!r.success) return { erro: primeiroErro(r.error) };
  const d = r.data;
  if (!d.fazEntrega && !d.fazRetirada) return { erro: "Marque entrega, retirada ou os dois." };
  if (d.abre >= d.fecha) return { erro: "O horário de fechar precisa ser depois do de abrir." };
  const taxaEntrega = reaisParaCentavos(d.taxaEntrega);
  const taxaExtra = reaisParaCentavos(d.taxaExtra);
  if (taxaEntrega === null || taxaExtra === null) return { erro: "Confira os valores das taxas." };

  const regras: RegrasHorario = {
    abre: d.abre,
    fecha: d.fecha,
    dias: [...new Set(d.dias)].sort(),
    aceitaImediato: d.aceitaImediato,
    prazoImediatoMin: d.prazoImediatoMin,
    aceitaExato: d.aceitaExato,
    janelaMinimaMin: d.janelaMinimaMin,
    capacidadePorJanela: d.capacidadePorJanela,
    taxaExtraCentavos: taxaExtra,
    limiteAcumulo: d.limiteAcumulo,
  };
  await db
    .update(schema.lojas)
    .set({
      fazEntrega: d.fazEntrega,
      fazRetirada: d.fazRetirada,
      raioKm: d.raioKm,
      taxaEntregaCentavos: taxaEntrega,
      regrasHorario: regras,
      vendeAlcool: d.vendeAlcool,
    })
    .where(eq(schema.lojas.id, loja.id));
  // Se deixou de vender álcool, tira os itens alcoólicos do catálogo.
  if (!d.vendeAlcool && loja.vendeAlcool) {
    await db
      .update(schema.produtos)
      .set({ disponivel: false })
      .where(and(eq(schema.produtos.lojaId, loja.id), eq(schema.produtos.alcoolico, true)));
  }
  revalidatePath("/loja", "layout");
  return { ok: "Ajustes salvos." };
}
