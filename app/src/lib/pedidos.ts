import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, gte, inArray, lt, lte, ne, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { capacidadeDaJanela, entregaNaData, sobrepoe, validarHorario, type TipoHorario } from "./agenda";
export { textoAceite } from "./agenda";
import { podeVender } from "./catalogo";
import { distanciaKm } from "./geo";
import { agoraLocal, deMinutos, somarDias } from "./tempo";

type Db = Awaited<ReturnType<typeof getDb>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Loja = typeof schema.lojas.$inferSelect;
export type Assinatura = typeof schema.assinaturas.$inferSelect;

export class ErroPedido extends Error {}

const ATIVOS = ["recebido", "confirmado", "separacao", "saiu", "pronto_retirada"] as const;

// ───────────────────────── Capacidade ─────────────────────────

/** Há vaga para mais uma entrega nessa janela? */
export async function temVaga(db: Db | Tx, loja: Loja, data: string, inicio: string, fim: string): Promise<boolean> {
  const doDia = await db
    .select({ inicio: schema.pedidos.horaInicio, fim: schema.pedidos.horaFim })
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.lojaId, loja.id), eq(schema.pedidos.data, data), inArray(schema.pedidos.status, [...ATIVOS]), eq(schema.pedidos.modo, "entrega")));
  const ocupados = doDia.filter((p) => sobrepoe(p, { inicio, fim })).length;
  return ocupados < capacidadeDaJanela(loja.regrasHorario, inicio, fim);
}

// ───────────────────────── Pedido avulso / extra ─────────────────────────

export type NovoPedido = {
  clienteId: string;
  lojaId: string;
  enderecoId: string;
  ponto: { lat: number; lng: number };
  modo: "entrega" | "retirada";
  tipoHorario: TipoHorario;
  data: string;
  inicio: string;
  fim: string;
  galoes: number;
  cascosComprados: number;
  itens: { produtoId: string; qtd: number }[];
  formaPagamento: "pix" | "cartao" | "na_entrega";
  declarou18: boolean;
  /** Compra adicional de assinante: galão sai pelo preço do plano. */
  assinaturaId?: string | null;
};

export async function criarPedido(n: NovoPedido): Promise<{ id: string; numero: number }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [loja] = await tx.select().from(schema.lojas).where(and(eq(schema.lojas.id, n.lojaId), eq(schema.lojas.status, "aprovada"))).limit(1);
    if (!loja) throw new ErroPedido("Esta distribuidora não está disponível.");
    if (n.modo === "entrega") {
      if (!loja.fazEntrega) throw new ErroPedido("Esta loja não faz entrega.");
      if (distanciaKm(n.ponto, loja) > loja.raioKm) throw new ErroPedido("Seu endereço está fora da área de entrega desta loja.");
    } else if (!loja.fazRetirada) throw new ErroPedido("Esta loja não faz retirada.");

    // Horário
    let { inicio, fim } = n;
    if (n.tipoHorario === "imediato") {
      const agora = agoraLocal();
      inicio = agora.hora;
      fim = deMinutos(Math.min(agora.minutos + loja.regrasHorario.prazoImediatoMin, 23 * 60 + 59));
    }
    const erroH = validarHorario(loja.regrasHorario, n.tipoHorario, n.data, inicio, fim);
    if (erroH) throw new ErroPedido(erroH);
    if (n.modo === "entrega" && !(await temVaga(tx, loja, n.data, inicio, fim))) {
      throw new ErroPedido("Esse horário lotou. Escolha outro horário ou outra janela.");
    }

    // Produtos
    const produtos = await tx.select().from(schema.produtos).where(eq(schema.produtos.lojaId, loja.id));
    const galao = produtos.find((p) => p.categoria === "agua_galao");
    const casco = produtos.find((p) => p.categoria === "casco");
    const linhas: { produto: (typeof produtos)[number]; qtd: number; preco: number }[] = [];

    let precoGalao = galao?.precoCentavos ?? 0;
    if (n.assinaturaId) {
      const [a] = await tx
        .select({ planoPreco: schema.planos.precoCentavos, planoGaloes: schema.planos.galoesMes })
        .from(schema.assinaturas)
        .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId))
        .where(and(eq(schema.assinaturas.id, n.assinaturaId), eq(schema.assinaturas.clienteId, n.clienteId), eq(schema.assinaturas.lojaId, loja.id)))
        .limit(1);
      if (!a) throw new ErroPedido("Assinatura não encontrada.");
      precoGalao = Math.round(a.planoPreco / a.planoGaloes);
    }
    if (n.galoes > 0) {
      if (!galao || !podeVender(galao)) throw new ErroPedido("A loja está sem galão no momento.");
      linhas.push({ produto: galao, qtd: n.galoes, preco: precoGalao });
    }
    for (const it of n.itens) {
      if (it.qtd <= 0) continue;
      const p = produtos.find((x) => x.id === it.produtoId);
      if (!p || !podeVender(p) || p.categoria === "agua_galao" || p.categoria === "casco") throw new ErroPedido("Um dos produtos não está mais disponível.");
      if (p.alcoolico && !loja.vendeAlcool) throw new ErroPedido("Esta loja não vende bebida alcoólica.");
      linhas.push({ produto: p, qtd: it.qtd, preco: p.precoCentavos });
    }
    const cascosComprados = Math.max(0, Math.min(n.cascosComprados, n.galoes));
    if (cascosComprados > 0) {
      if (!casco) throw new ErroPedido("A loja não vende casco pelo app.");
      linhas.push({ produto: casco, qtd: cascosComprados, preco: casco.precoCentavos });
    }
    if (!linhas.length) throw new ErroPedido("Seu pedido está vazio.");
    const temAlcool = linhas.some((l) => l.produto.alcoolico);
    if (temAlcool && !n.declarou18) throw new ErroPedido("Para bebida alcoólica, confirme que você tem 18 anos ou mais.");

    // Estoque (só itens que a loja controla): baixa atômica.
    for (const l of linhas) {
      if (l.produto.estoque === null) continue;
      const r = await tx
        .update(schema.produtos)
        .set({ estoque: sql`${schema.produtos.estoque} - ${l.qtd}` })
        .where(and(eq(schema.produtos.id, l.produto.id), gte(schema.produtos.estoque, l.qtd)))
        .returning({ id: schema.produtos.id });
      if (!r.length) throw new ErroPedido(`Só restam ${l.produto.estoque} de ${l.produto.nome}.`);
    }

    const subtotal = linhas.reduce((s, l) => s + l.preco * l.qtd, 0);
    const taxaEntrega = n.modo === "entrega" ? loja.taxaEntregaCentavos : 0;
    const taxaHorario = n.modo === "entrega" && (n.tipoHorario === "imediato" || n.tipoHorario === "exato") ? loja.regrasHorario.taxaExtraCentavos : 0;

    const [pedido] = await tx
      .insert(schema.pedidos)
      .values({
        clienteId: n.clienteId,
        lojaId: loja.id,
        assinaturaId: n.assinaturaId ?? null,
        origem: n.assinaturaId ? "extra" : "avulso",
        enderecoId: n.modo === "entrega" ? n.enderecoId : null,
        modo: n.modo,
        tipoHorario: n.tipoHorario,
        data: n.data,
        horaInicio: inicio,
        horaFim: fim,
        subtotalCentavos: subtotal,
        taxaEntregaCentavos: taxaEntrega,
        taxaHorarioCentavos: taxaHorario,
        totalCentavos: subtotal + taxaEntrega + taxaHorario,
        formaPagamento: n.formaPagamento,
        cascosTroca: n.galoes - cascosComprados,
        cascosComprados,
        temAlcool,
        codigoRetirada: n.modo === "retirada" ? String(randomInt(1000, 10000)) : null,
      })
      .returning({ id: schema.pedidos.id, numero: schema.pedidos.numero });
    await tx.insert(schema.itensPedido).values(
      linhas.map((l) => ({
        pedidoId: pedido.id,
        produtoId: l.produto.id,
        nome: l.produto.marca ? `${l.produto.nome} · ${l.produto.marca}` : l.produto.nome,
        qtd: l.qtd,
        precoUnitCentavos: l.preco,
        alcoolico: l.produto.alcoolico,
        retornavel: l.produto.retornavel,
      })),
    );
    await tx.insert(schema.eventosPedido).values({ pedidoId: pedido.id, status: "recebido", porUsuarioId: n.clienteId });
    if (temAlcool) await tx.update(schema.usuarios).set({ declarou18: true }).where(eq(schema.usuarios.id, n.clienteId));
    return pedido;
  });
}

/** Cliente cancela um pedido que a loja ainda não confirmou; devolve o estoque. */
export async function cancelarPedidoCliente(clienteId: string, pedidoId: string, motivo = "Cancelado pelo cliente"): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [p] = await tx
      .select()
      .from(schema.pedidos)
      .where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.clienteId, clienteId)))
      .limit(1);
    if (!p) throw new ErroPedido("Pedido não encontrado.");
    if (p.status !== "recebido") throw new ErroPedido("A loja já confirmou este pedido. Fale com ela pelo WhatsApp.");
    await devolverEstoque(tx, p.id);
    await tx.update(schema.pedidos).set({ status: "cancelado", motivo }).where(eq(schema.pedidos.id, p.id));
    await tx.insert(schema.eventosPedido).values({ pedidoId: p.id, status: "cancelado", porUsuarioId: clienteId, nota: motivo });
  });
}

export async function devolverEstoque(tx: Tx, pedidoId: string) {
  const itens = await tx.select().from(schema.itensPedido).where(eq(schema.itensPedido.pedidoId, pedidoId));
  for (const it of itens) {
    if (!it.produtoId) continue;
    await tx
      .update(schema.produtos)
      .set({ estoque: sql`${schema.produtos.estoque} + ${it.qtd}` })
      .where(and(eq(schema.produtos.id, it.produtoId), sql`${schema.produtos.estoque} is not null`));
  }
}

// ───────────────────────── Assinatura ─────────────────────────

export const HORIZONTE_DIAS = 21;

/** Último dia do ciclo mensal que começa em `inicio` (ex.: 10/11 → 09/12). */
export function fimDoCiclo(inicio: string): string {
  const [a, m, d] = inicio.split("-").map(Number);
  const prox = new Date(Date.UTC(a, m, d)); // mesmo dia no mês seguinte
  return somarDias(prox.toISOString().slice(0, 10), -1);
}


/** Início do ciclo mensal que contém `data` (ciclos começam em `cicloInicio` e avançam de mês em mês). */
export function inicioDoCicloDe(cicloInicio: string, data: string): string {
  let ini = cicloInicio;
  if (data < ini) return ini;
  for (let i = 0; i < 60; i++) {
    const prox = somarDias(fimDoCiclo(ini), 1);
    if (prox > data) return ini;
    ini = prox;
  }
  return ini;
}

/**
 * Renova o ciclo quando o mês acaba (e aplica a troca de plano agendada).
 * Chamada antes de gerar entregas — por isso a renovação é “preguiçosa”.
 */
async function renovarCiclo(db: Db | Tx, a: Assinatura): Promise<Assinatura> {
  const hoje = agoraLocal().data;
  let { cicloInicio, planoId, planoProximoId } = a;
  let mudou = false;
  while (hoje > fimDoCiclo(cicloInicio)) {
    cicloInicio = somarDias(fimDoCiclo(cicloInicio), 1);
    if (planoProximoId) {
      planoId = planoProximoId;
      planoProximoId = null;
    }
    mudou = true;
  }
  if (!mudou) return a;
  const [novo] = await db
    .update(schema.assinaturas)
    .set({ cicloInicio, planoId, planoProximoId })
    .where(eq(schema.assinaturas.id, a.id))
    .returning();
  return novo;
}

/**
 * Cria/garante os pedidos das entregas do plano nos próximos dias (idempotente).
 * A primeira entrega de cada ciclo mensal leva a cobrança da mensalidade
 * (e os cascos comprados, se houver), paga na entrega até o pagamento pelo app chegar.
 */
export async function gerarEntregas(db: Db | Tx, assinaturaId: string, ate?: string): Promise<void> {
  const [bruta] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assinaturaId)).limit(1);
  if (!bruta || bruta.status === "pausada") return;
  if (bruta.status === "cancelada" && !bruta.validaAte) return;
  let a = await renovarCiclo(db, bruta);

  const [loja] = await db.select().from(schema.lojas).where(eq(schema.lojas.id, a.lojaId)).limit(1);
  const planosIds = [a.planoId, ...(a.planoProximoId ? [a.planoProximoId] : [])];
  const planosRows = await db.select().from(schema.planos).where(inArray(schema.planos.id, planosIds));
  const plano = planosRows.find((p) => p.id === a.planoId)!;
  const proximo = planosRows.find((p) => p.id === a.planoProximoId) ?? null;
  const [galao] = await db.select().from(schema.produtos).where(eq(schema.produtos.id, plano.produtoId)).limit(1);
  const [casco] = await db
    .select()
    .from(schema.produtos)
    .where(and(eq(schema.produtos.lojaId, a.lojaId), eq(schema.produtos.categoria, "casco")))
    .limit(1);

  const hoje = agoraLocal().data;
  let limite = ate ?? somarDias(hoje, HORIZONTE_DIAS);
  if (a.validaAte && a.validaAte < limite) limite = a.validaAte;
  const fimCicloAtual = fimDoCiclo(a.cicloInicio);
  const taxa = a.modo === "entrega" ? loja.taxaEntregaCentavos : 0;

  for (let d = a.agenda.primeiraData > hoje ? a.agenda.primeiraData : hoje; d <= limite; d = somarDias(d, 1)) {
    if (!entregaNaData(a.agenda, d) || a.pulos.includes(d)) continue;

    // Primeira entrega (não cancelada) do ciclo deste dia? Então leva a mensalidade.
    const iniCiclo = inicioDoCicloDe(a.cicloInicio, d);
    const anteriores = await db
      .select({ id: schema.pedidos.id })
      .from(schema.pedidos)
      .where(
        and(
          eq(schema.pedidos.assinaturaId, a.id),
          eq(schema.pedidos.origem, "plano"),
          gte(schema.pedidos.data, iniCiclo),
          lt(schema.pedidos.data, d),
          ne(schema.pedidos.status, "cancelado"),
        ),
      )
      .limit(1);
    const cobraMensalidade = anteriores.length === 0;
    const precoPlano = d > fimCicloAtual && proximo ? proximo.precoCentavos : plano.precoCentavos;
    const cascos = a.cascosAComprar > 0 && casco ? Math.min(a.cascosAComprar, a.agenda.qtdPorEntrega) : 0;
    const valorCascos = cascos * (casco?.precoCentavos ?? 0);
    const subtotal = (cobraMensalidade ? precoPlano : 0) + valorCascos;

    const inseridos = await db
      .insert(schema.pedidos)
      .values({
        clienteId: a.clienteId,
        lojaId: a.lojaId,
        assinaturaId: a.id,
        origem: "plano",
        enderecoId: a.enderecoId,
        modo: a.modo,
        tipoHorario: a.agenda.tipoHorario,
        data: d,
        horaInicio: a.agenda.inicio,
        horaFim: a.agenda.fim,
        subtotalCentavos: subtotal,
        taxaEntregaCentavos: taxa,
        totalCentavos: subtotal + taxa,
        formaPagamento: subtotal + taxa > 0 ? "na_entrega" : "plano",
        cascosTroca: a.agenda.qtdPorEntrega - cascos,
        cascosComprados: cascos,
        codigoRetirada: a.modo === "retirada" ? String(randomInt(1000, 10000)) : null,
      })
      .onConflictDoNothing()
      .returning({ id: schema.pedidos.id });
    if (!inseridos.length) continue;
    const pedidoId = inseridos[0].id;

    const itens: (typeof schema.itensPedido.$inferInsert)[] = [
      {
        pedidoId,
        produtoId: galao?.id ?? null,
        nome: galao?.marca ? `${galao.nome} · ${galao.marca}` : (galao?.nome ?? "Galão 20 L"),
        qtd: a.agenda.qtdPorEntrega,
        precoUnitCentavos: 0,
        retornavel: true,
      },
    ];
    if (cobraMensalidade) {
      itens.push({ pedidoId, produtoId: null, nome: `Mensalidade do plano (${plano.galoesMes} galões)`, qtd: 1, precoUnitCentavos: precoPlano });
    }
    if (cascos && casco) {
      itens.push({ pedidoId, produtoId: casco.id, nome: casco.nome, qtd: cascos, precoUnitCentavos: casco.precoCentavos });
    }
    await db.insert(schema.itensPedido).values(itens);
    await db.insert(schema.eventosPedido).values({ pedidoId, status: "recebido", nota: cobraMensalidade ? "Entrega do plano · inclui a mensalidade" : "Entrega do plano" });
    if (cascos) {
      [a] = await db
        .update(schema.assinaturas)
        .set({ cascosAComprar: a.cascosAComprar - cascos })
        .where(eq(schema.assinaturas.id, a.id))
        .returning();
    }
  }
}

/**
 * Remove as entregas futuras ainda não saídas (para regerar com a nova agenda).
 * Cascos comprados nelas voltam para a assinatura, para irem na próxima entrega.
 */
export async function removerEntregasFuturas(tx: Tx, assinaturaId: string, aPartirDe: string, ate?: string) {
  const futuros = await tx
    .select({ id: schema.pedidos.id, cascos: schema.pedidos.cascosComprados })
    .from(schema.pedidos)
    .where(
      and(
        eq(schema.pedidos.assinaturaId, assinaturaId),
        eq(schema.pedidos.origem, "plano"),
        gte(schema.pedidos.data, aPartirDe),
        ate ? lte(schema.pedidos.data, ate) : undefined,
        inArray(schema.pedidos.status, ["recebido", "confirmado"]),
      ),
    );
  if (!futuros.length) return;
  const cascos = futuros.reduce((s, f) => s + f.cascos, 0);
  await tx.delete(schema.pedidos).where(inArray(schema.pedidos.id, futuros.map((f) => f.id)));
  if (cascos) {
    await tx
      .update(schema.assinaturas)
      .set({ cascosAComprar: sql`${schema.assinaturas.cascosAComprar} + ${cascos}` })
      .where(eq(schema.assinaturas.id, assinaturaId));
  }
}

/** Galões do plano programados (não cancelados) no ciclo atual. */
export async function galoesNoCiclo(db: Db | Tx, a: Assinatura): Promise<{ programados: number; entregues: number; fim: string }> {
  const fim = fimDoCiclo(a.cicloInicio);
  const linhas = await db
    .select({ qtd: schema.itensPedido.qtd, status: schema.pedidos.status })
    .from(schema.pedidos)
    .innerJoin(schema.itensPedido, eq(schema.itensPedido.pedidoId, schema.pedidos.id))
    .where(
      and(
        eq(schema.pedidos.assinaturaId, a.id),
        eq(schema.pedidos.origem, "plano"),
        gte(schema.pedidos.data, a.cicloInicio),
        lte(schema.pedidos.data, fim),
        notInArray(schema.pedidos.status, ["cancelado", "nao_entregue"]),
        eq(schema.itensPedido.retornavel, true),
      ),
    );
  return {
    programados: linhas.reduce((s, l) => s + l.qtd, 0),
    entregues: linhas.filter((l) => l.status === "entregue" || l.status === "retirado").reduce((s, l) => s + l.qtd, 0),
    fim,
  };
}
