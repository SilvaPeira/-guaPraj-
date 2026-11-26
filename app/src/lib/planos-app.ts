import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { agoraLocal } from "./tempo";

// Planos do ÁguaPrajá para as distribuidoras (seção 7 do documento).
// O admin cria os planos; a loja escolhe; as regras valem no app inteiro.
// Plano pago vencido → a loja volta às regras do plano grátis.
// Nenhum plano cadastrado → nada é limitado (o app funciona como antes).

export type PlanoApp = typeof schema.planosApp.$inferSelect;

/** Ponto de partida: Essencial e Completo (só o Completo tem app próprio). */
export const PLANOS_APP_SUGERIDOS: Omit<typeof schema.planosApp.$inferInsert, "id">[] = [
  { nome: "Essencial", precoCentavos: 4490, descricao: "Pedidos, assinaturas e pagamento pelo app (Pix e cartão).", limiteAssinantes: 100, limiteEntregadores: 3, pagamentoOnline: true, produtosExtras: true, appProprio: false, ordem: 1 },
  { nome: "Completo", precoCentavos: 9990, descricao: "Tudo do Essencial, sem limites, e o app próprio com a marca da sua loja.", limiteAssinantes: null, limiteEntregadores: null, pagamentoOnline: true, produtosExtras: true, appProprio: true, ordem: 2 },
];

/** Categorias que contam como "produtos extras" (além da água). */
export const CATEGORIAS_EXTRAS = ["refrigerante", "suco", "gelo", "polpa", "alcoolica"] as const;
export const ehExtra = (categoria: string) => (CATEGORIAS_EXTRAS as readonly string[]).includes(categoria);

export type Recursos = {
  limiteAssinantes: number | null;
  limiteEntregadores: number | null;
  pagamentoOnline: boolean;
  produtosExtras: boolean;
  appProprio: boolean;
};

const SEM_LIMITES: Recursos = { limiteAssinantes: null, limiteEntregadores: null, pagamentoOnline: true, produtosExtras: true, appProprio: true };
/** Sem plano grátis cadastrado, quem não pagou fica com o básico do documento. */
const BASICO: Recursos = { limiteAssinantes: 15, limiteEntregadores: 1, pagamentoOnline: false, produtosExtras: false, appProprio: false };

export type SituacaoPlano = {
  /** Plano escolhido pela loja (pode estar vencido). */
  escolhido: PlanoApp | null;
  /** Plano cujas regras valem agora. */
  vigente: PlanoApp | null;
  vencido: boolean;
  pagoAte: string | null;
  recursos: Recursos;
  /** Quanto a loja paga por mês agora (com desconto; 0 no período grátis). */
  valorCentavos: number;
  /** Cortesia do admin: grátis até este dia (inclusive). */
  gratisAte: string | null;
  /** Desconto do admin valendo agora. */
  desconto: { percentual: number; ate: string | null } | null;
};

/** Benefícios que o admin pode dar na mensalidade (desconto e/ou período grátis). */
export type Beneficio = { descontoMensalidade?: number | null; descontoAte?: string | null; gratisAte?: string | null };

/** Valor da mensalidade com o desconto (arredondado ao centavo). */
export function aplicarDesconto(precoCentavos: number, percentual: number): number {
  return Math.max(0, Math.round((precoCentavos * (100 - Math.min(100, Math.max(0, percentual)))) / 100));
}

export async function listarPlanosApp(somenteAtivos = false): Promise<PlanoApp[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.planosApp)
    .where(somenteAtivos ? eq(schema.planosApp.ativo, true) : undefined)
    .orderBy(asc(schema.planosApp.ordem), asc(schema.planosApp.precoCentavos));
}

const recursosDe = (p: PlanoApp): Recursos => ({
  limiteAssinantes: p.limiteAssinantes,
  limiteEntregadores: p.limiteEntregadores,
  pagamentoOnline: p.pagamentoOnline,
  produtosExtras: p.produtosExtras,
  appProprio: p.appProprio,
});

export function calcularSituacao(
  loja: { planoAppId: string | null; planoAppPagoAte: string | null } & Beneficio,
  planos: PlanoApp[],
  hoje = agoraLocal().data,
): SituacaoPlano {
  const escolhido = planos.find((p) => p.id === loja.planoAppId) ?? null;
  const gratisAte = loja.gratisAte && loja.gratisAte >= hoje ? loja.gratisAte : null;
  const pct = loja.descontoMensalidade ?? 0;
  const desconto = pct > 0 && (!loja.descontoAte || loja.descontoAte >= hoje) ? { percentual: Math.min(100, pct), ate: loja.descontoAte ?? null } : null;
  const valorCentavos = !escolhido || gratisAte ? 0 : desconto ? aplicarDesconto(escolhido.precoCentavos, desconto.percentual) : escolhido.precoCentavos;
  // Grátis (cortesia) ou 100% de desconto: o plano vale sem precisar registrar pagamento.
  const pago =
    !!escolhido && (escolhido.precoCentavos === 0 || !!gratisAte || valorCentavos === 0 || (!!loja.planoAppPagoAte && loja.planoAppPagoAte >= hoje));
  const gratis = planos.filter((p) => p.ativo && p.precoCentavos === 0).sort((a, b) => a.ordem - b.ordem)[0] ?? null;
  const vigente = pago ? escolhido : gratis;
  return {
    escolhido,
    vigente,
    vencido: !!escolhido && !pago,
    pagoAte: loja.planoAppPagoAte,
    recursos: vigente ? recursosDe(vigente) : planos.length ? BASICO : SEM_LIMITES,
    valorCentavos,
    gratisAte,
    desconto,
  };
}

export async function situacaoDaLoja(lojaId: string): Promise<SituacaoPlano> {
  const db = await getDb();
  const [loja] = await db
    .select({
      planoAppId: schema.lojas.planoAppId,
      planoAppPagoAte: schema.lojas.planoAppPagoAte,
      descontoMensalidade: schema.lojas.descontoMensalidade,
      descontoAte: schema.lojas.descontoAte,
      gratisAte: schema.lojas.gratisAte,
    })
    .from(schema.lojas)
    .where(eq(schema.lojas.id, lojaId))
    .limit(1);
  return calcularSituacao(loja ?? { planoAppId: null, planoAppPagoAte: null }, await listarPlanosApp());
}

export async function recursosDaLoja(lojaId: string): Promise<Recursos> {
  return (await situacaoDaLoja(lojaId)).recursos;
}

export async function assinantesDaLoja(lojaId: string): Promise<number> {
  const db = await getDb();
  const [r] = await db
    .select({ n: count() })
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.lojaId, lojaId), inArray(schema.assinaturas.status, ["ativa", "pausada"])));
  return r?.n ?? 0;
}

export async function entregadoresDaLoja(lojaId: string): Promise<number> {
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(schema.entregadores).where(eq(schema.entregadores.lojaId, lojaId));
  return r?.n ?? 0;
}

/** A loja ainda pode receber um assinante novo? */
export async function aceitaNovoAssinante(lojaId: string): Promise<boolean> {
  const { limiteAssinantes } = await recursosDaLoja(lojaId);
  return limiteAssinantes === null || (await assinantesDaLoja(lojaId)) < limiteAssinantes;
}

export function textoLimite(n: number | null, singular: string, plural: string) {
  return n === null ? `${plural} ilimitados` : `até ${n} ${n === 1 ? singular : plural}`;
}
