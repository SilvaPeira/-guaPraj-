import "server-only";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { devolverEstoque, ErroPedido, gerarEntregas } from "./pedidos";
import { exigirUsuario } from "./sessao";
import { agoraLocal, somarDias } from "./tempo";
import { proximosStatus, type StatusPedido } from "./status";
export { proximosStatus };

type Db = Awaited<ReturnType<typeof getDb>>;

/** Dono da loja ou entregador cadastrado nela. */
export async function exigirOperador() {
  const u = await exigirUsuario(["loja", "entregador"]);
  const db = await getDb();
  let lojaId: string | undefined;
  if (u.papel === "loja") {
    const [l] = await db.select({ id: schema.lojas.id }).from(schema.lojas).where(eq(schema.lojas.donoId, u.id)).limit(1);
    lojaId = l?.id;
    if (!lojaId) redirect("/loja/cadastro");
  } else {
    const [e] = await db.select({ lojaId: schema.entregadores.lojaId }).from(schema.entregadores).where(eq(schema.entregadores.usuarioId, u.id)).limit(1);
    lojaId = e?.lojaId;
    if (!lojaId) redirect("/");
  }
  const [loja] = await db.select().from(schema.lojas).where(eq(schema.lojas.id, lojaId!)).limit(1);
  return { usuario: u, loja, db, ehDono: u.papel === "loja" };
}

/**
 * Garante que as entregas dos planos da loja existam até `ate`.
 * Assim a agenda da loja mostra tudo, mesmo que o cliente não abra o app.
 */
export async function garantirEntregasDaLoja(db: Db, lojaId: string, ate: string) {
  const ativas = await db
    .select({ id: schema.assinaturas.id })
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.lojaId, lojaId), inArray(schema.assinaturas.status, ["ativa", "cancelada"])));
  for (const a of ativas) await gerarEntregas(db, a.id, ate);
}

export type PedidoAgenda = Awaited<ReturnType<typeof agendaDoDia>>[number];

/** Pedidos de um dia, com cliente, endereço e itens. */
export async function agendaDoDia(db: Db, lojaId: string, data: string) {
  const linhas = await db
    .select({
      p: schema.pedidos,
      cliente: { nome: schema.usuarios.nome, telefone: schema.usuarios.telefone },
      end: schema.enderecos,
    })
    .from(schema.pedidos)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.pedidos.clienteId))
    .leftJoin(schema.enderecos, eq(schema.enderecos.id, schema.pedidos.enderecoId))
    .where(and(eq(schema.pedidos.lojaId, lojaId), eq(schema.pedidos.data, data)))
    .orderBy(asc(schema.pedidos.horaInicio), asc(schema.enderecos.bairro));
  const ids = linhas.map((l) => l.p.id);
  const itens = ids.length ? await db.select().from(schema.itensPedido).where(inArray(schema.itensPedido.pedidoId, ids)) : [];
  return linhas.map((l) => ({
    ...l.p,
    cliente: l.cliente,
    endereco: l.end,
    itens: itens.filter((i) => i.pedidoId === l.p.id),
    galoes: itens.filter((i) => i.pedidoId === l.p.id && i.retornavel).reduce((s, i) => s + i.qtd, 0),
  }));
}

/** Pedidos de dias anteriores que ficaram sem desfecho (para a loja resolver). */
export async function pendentesAtrasados(db: Db, lojaId: string) {
  const hoje = agoraLocal().data;
  return db
    .select({ id: schema.pedidos.id, data: schema.pedidos.data, numero: schema.pedidos.numero, status: schema.pedidos.status })
    .from(schema.pedidos)
    .where(
      and(
        eq(schema.pedidos.lojaId, lojaId),
        sql`${schema.pedidos.data} < ${hoje}`,
        notInArray(schema.pedidos.status, ["entregue", "retirado", "nao_entregue", "cancelado"]),
      ),
    )
    .orderBy(asc(schema.pedidos.data));
}

// ───────────────────────── Mudança de status ─────────────────────────

export type Conclusao = {
  cascosRecolhidos?: number;
  documentoConferido?: boolean;
  pagamentoRecebido?: boolean;
  motivo?: string;
  codigoRetirada?: string;
};

/** Muda o status de um ou mais pedidos da loja (atualização em lote). Devolve quantos mudaram. */
export async function mudarStatus(lojaId: string, porUsuarioId: string, pedidoIds: string[], novo: StatusPedido, c: Conclusao = {}): Promise<number> {
  const db = await getDb();
  if (!pedidoIds.length) return 0;
  return db.transaction(async (tx) => {
    const pedidos = await tx
      .select()
      .from(schema.pedidos)
      .where(and(eq(schema.pedidos.lojaId, lojaId), inArray(schema.pedidos.id, pedidoIds)));
    let mudou = 0;
    for (const p of pedidos) {
      if (!proximosStatus(p.status, p.modo).includes(novo)) {
        if (pedidos.length === 1) throw new ErroPedido(`Não dá para passar de “${p.status}” para “${novo}”.`);
        continue; // no lote, ignora os que não podem
      }
      const mudanca: Partial<typeof schema.pedidos.$inferInsert> = { status: novo };
      let nota: string | null = null;

      if (novo === "entregue" || novo === "retirado") {
        if (p.temAlcool && !c.documentoConferido) throw new ErroPedido(`Pedido #${p.numero} tem bebida alcoólica: confira o documento (18+).`);
        if (novo === "retirado" && p.codigoRetirada && c.codigoRetirada !== undefined && c.codigoRetirada !== p.codigoRetirada) {
          throw new ErroPedido("Código de retirada não confere.");
        }
        mudanca.documentoConferido = !!c.documentoConferido;
        if (c.pagamentoRecebido !== false && p.totalCentavos > 0) mudanca.statusPagamento = "pago";
        // Cascos: o que não voltou fica "em mãos" do cliente (comodato).
        const recolhidos = Math.max(0, Math.min(c.cascosRecolhidos ?? p.cascosTroca, p.cascosTroca));
        const faltam = p.cascosTroca - recolhidos;
        if (faltam > 0) {
          await tx.insert(schema.movimentosCasco).values({ lojaId, clienteId: p.clienteId, pedidoId: p.id, delta: faltam, nota: "Não devolveu na entrega" });
          nota = `${faltam} casco(s) não recolhido(s)`;
        }
      }
      if (novo === "nao_entregue") {
        mudanca.motivo = c.motivo || "Cliente não estava em casa";
        nota = mudanca.motivo;
      }
      if (novo === "cancelado") {
        mudanca.motivo = c.motivo || "Cancelado pela loja";
        nota = mudanca.motivo;
        await devolverEstoque(tx, p.id);
      }
      await tx.update(schema.pedidos).set(mudanca).where(eq(schema.pedidos.id, p.id));
      await tx.insert(schema.eventosPedido).values({ pedidoId: p.id, status: novo, porUsuarioId, nota });
      mudou++;
    }
    return mudou;
  });
}

/**
 * "Não estava em casa": nova tentativa em outro dia (doc, seção 5).
 * Para entregas do plano, não pode cair num dia que já tem entrega do plano.
 */
export async function reagendar(lojaId: string, porUsuarioId: string, pedidoId: string, novaData: string) {
  const db = await getDb();
  const hoje = agoraLocal().data;
  if (novaData < hoje || novaData > somarDias(hoje, 14)) throw new ErroPedido("Escolha uma data nos próximos 14 dias.");
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(schema.pedidos).where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.lojaId, lojaId))).limit(1);
    if (!p) throw new ErroPedido("Pedido não encontrado.");
    if (p.status !== "nao_entregue") throw new ErroPedido("Só dá para reagendar um pedido não entregue.");
    if (p.origem === "plano") {
      const [conflito] = await tx
        .select({ id: schema.pedidos.id })
        .from(schema.pedidos)
        .where(and(eq(schema.pedidos.assinaturaId, p.assinaturaId!), eq(schema.pedidos.origem, "plano"), eq(schema.pedidos.data, novaData)))
        .limit(1);
      if (conflito) throw new ErroPedido("Esse cliente já tem entrega do plano nesse dia. Junte as duas ou escolha outro dia.");
    }
    await tx.update(schema.pedidos).set({ data: novaData, status: "confirmado", motivo: null }).where(eq(schema.pedidos.id, p.id));
    await tx.insert(schema.eventosPedido).values({ pedidoId: p.id, status: "confirmado", porUsuarioId, nota: `Reagendado para ${novaData.slice(8, 10)}/${novaData.slice(5, 7)}` });
  });
}

/** Cascos da loja que estão com clientes (comodato). */
export async function cascosEmMaos(db: Db, lojaId: string) {
  return db
    .select({
      clienteId: schema.movimentosCasco.clienteId,
      nome: schema.usuarios.nome,
      telefone: schema.usuarios.telefone,
      total: sql<number>`sum(${schema.movimentosCasco.delta})::int`,
    })
    .from(schema.movimentosCasco)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.movimentosCasco.clienteId))
    .where(eq(schema.movimentosCasco.lojaId, lojaId))
    .groupBy(schema.movimentosCasco.clienteId, schema.usuarios.nome, schema.usuarios.telefone)
    .having(sql`sum(${schema.movimentosCasco.delta}) <> 0`);
}

export async function registrarCasco(lojaId: string, clienteId: string, delta: number, nota: string) {
  const db = await getDb();
  await db.insert(schema.movimentosCasco).values({ lojaId, clienteId, delta, nota });
}
