"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { RegrasHorario } from "@/db/schema";
import { exigirUsuario } from "@/lib/sessao";
import { normalizarTelefone } from "@/lib/telefone";
import { esquemaEndereco, primeiroErro, reaisParaCentavos } from "@/lib/validacao";

export type EstadoForm = { erro?: string };

const hora = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.");
const marcado = z.literal("on").optional().transform((v) => v === "on");
const dinheiro = (msg: string) =>
  z.unknown().transform((v, ctx) => {
    const c = reaisParaCentavos(v);
    if (c === null) {
      ctx.addIssue({ code: "custom", message: msg });
      return z.NEVER;
    }
    return c;
  });

const esquema = esquemaEndereco.omit({ referencia: true }).extend({
  nome: z.string().trim().min(2, "Informe o nome da loja.").max(80),
  documento: z.string().trim().regex(/^[\d./-]{11,20}$/, "Informe o CNPJ ou MEI (só números)."),
  telefone: z.string().transform((v, ctx) => {
    const t = normalizarTelefone(v);
    if (!t) {
      ctx.addIssue({ code: "custom", message: "WhatsApp da loja inválido." });
      return z.NEVER;
    }
    return t;
  }),
  marcasAgua: z.string().trim().max(120).optional(),
  fazEntrega: marcado,
  fazRetirada: marcado,
  raioKm: z.coerce.number().min(0.5, "Raio mínimo de 0,5 km.").max(30, "Raio máximo de 30 km."),
  taxaEntrega: dinheiro("Taxa de entrega inválida."),
  precoGalao: dinheiro("Informe o preço do galão avulso."),
  precoCasco: dinheiro("Informe o preço do casco (vasilhame)."),
  abre: hora,
  fecha: hora,
  dias: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Marque ao menos um dia de funcionamento."),
  vendeAlcool: marcado,
  seloFiscal: z.literal("on", { message: "A água precisa ter o selo fiscal do Pará para entrar no app." }),
  termos: z.literal("on", { message: "Aceite os termos para continuar." }),
});

export async function cadastrarLoja(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario(["cliente", "loja"]);
  const bruto = { ...Object.fromEntries(form), dias: form.getAll("dias") };
  const r = esquema.safeParse(bruto);
  if (!r.success) return { erro: primeiroErro(r.error) };
  const d = r.data;
  if (!d.fazEntrega && !d.fazRetirada) return { erro: "Marque entrega, retirada ou os dois." };
  if (d.abre >= d.fecha) return { erro: "O horário de fechar precisa ser depois do de abrir." };
  if (d.precoGalao <= 0) return { erro: "Informe o preço do galão avulso." };

  const db = await getDb();
  const [jaTem] = await db.select({ id: schema.lojas.id }).from(schema.lojas).where(eq(schema.lojas.donoId, u.id)).limit(1);
  if (jaTem) redirect("/loja");

  const regras: RegrasHorario = {
    abre: d.abre,
    fecha: d.fecha,
    dias: [...new Set(d.dias)].sort(),
    aceitaImediato: true,
    prazoImediatoMin: 60,
    aceitaExato: true,
    janelaMinimaMin: 30,
    capacidadePorJanela: 4,
    taxaExtraCentavos: 200,
  };

  await db.transaction(async (tx) => {
    const [loja] = await tx
      .insert(schema.lojas)
      .values({
        donoId: u.id,
        nome: d.nome,
        documento: d.documento.replace(/\D/g, ""),
        telefone: d.telefone,
        endereco: [d.logradouro, d.numero, d.complemento].filter(Boolean).join(", "),
        bairro: d.bairro,
        cidade: d.cidade,
        lat: d.lat,
        lng: d.lng,
        raioKm: d.raioKm,
        marcasAgua: d.marcasAgua || null,
        fazEntrega: d.fazEntrega,
        fazRetirada: d.fazRetirada,
        taxaEntregaCentavos: d.taxaEntrega,
        regrasHorario: regras,
        vendeAlcool: d.vendeAlcool,
        seloFiscalDeclarado: true,
      })
      .returning();
    const [galao] = await tx
      .insert(schema.produtos)
      .values({ lojaId: loja.id, nome: "Galão de água 20 L", categoria: "agua_galao", retornavel: true, precoCentavos: d.precoGalao, ordem: 0 })
      .returning();
    await tx.insert(schema.produtos).values({ lojaId: loja.id, nome: "Casco (vasilhame 20 L)", categoria: "casco", precoCentavos: d.precoCasco, ordem: 99 });
    // Planos padrão (8, 12, 16, 20, 24, 32) com 10% de desconto — a loja ajusta depois.
    await tx.insert(schema.planos).values(
      [8, 12, 16, 20, 24, 32].map((g) => ({
        lojaId: loja.id,
        produtoId: galao.id,
        galoesMes: g,
        precoCentavos: Math.round((g * d.precoGalao * 0.9) / 100) * 100,
      })),
    );
    await tx.update(schema.usuarios).set({ papel: "loja", aceitouTermosEm: u.aceitouTermosEm ?? new Date(), nome: u.nome ?? d.nome }).where(eq(schema.usuarios.id, u.id));
  });

  redirect("/loja");
}
