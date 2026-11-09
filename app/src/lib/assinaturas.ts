import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { AgendaPlano } from "@/db/schema";
import { proximasEntregas, validarHorario } from "./agenda";
import { distanciaKm, RAIO_RETIRADA_KM } from "./geo";
import { ErroPedido, fimDoCiclo, gerarEntregas, removerEntregasFuturas, temVaga, textoAceite } from "./pedidos";
import { agoraLocal, somarDias } from "./tempo";

export type DadosAgenda = Omit<AgendaPlano, "primeiraData">;

/** Valida a agenda e calcula a primeira entrega (a partir de amanhã). */
async function prepararAgenda(
  loja: typeof schema.lojas.$inferSelect,
  modo: "entrega" | "retirada",
  d: DadosAgenda,
  aPartirDe: string,
): Promise<AgendaPlano> {
  if (!["semanal", "quinzenal", "mensal"].includes(d.frequencia)) throw new ErroPedido("Escolha a frequência.");
  const dias = [...new Set(d.dias)].filter((x) => Number.isInteger(x) && x >= 0 && x <= 6).sort();
  if (!dias.length) throw new ErroPedido("Escolha o dia da entrega.");
  if (d.frequencia !== "semanal" && dias.length > 1) throw new ErroPedido("Na entrega quinzenal ou mensal, escolha um dia só.");
  if (dias.length > 3) throw new ErroPedido("Escolha no máximo 3 dias por semana.");
  if (!Number.isInteger(d.qtdPorEntrega) || d.qtdPorEntrega < 1 || d.qtdPorEntrega > 30) throw new ErroPedido("Galões por entrega: de 1 a 30.");
  if (!["exato", "janela", "periodo"].includes(d.tipoHorario)) throw new ErroPedido("Escolha o horário.");
  for (const dia of dias) {
    if (!loja.regrasHorario.dias.includes(dia)) throw new ErroPedido("A loja não abre em um dos dias escolhidos.");
  }
  const base = { ...d, dias, primeiraData: aPartirDe };
  const primeiras = proximasEntregas(base, aPartirDe, 3);
  if (!primeiras.length) throw new ErroPedido("Não encontramos data de entrega para essa escolha.");
  const agenda: AgendaPlano = { ...base, primeiraData: primeiras[0] };
  const erro = validarHorario(loja.regrasHorario, d.tipoHorario, agenda.primeiraData, d.inicio, d.fim, { ehPlano: true });
  if (erro) throw new ErroPedido(erro);
  if (modo === "entrega") {
    for (const data of primeiras) {
      if (!(await temVaga(await getDb(), loja, data, d.inicio, d.fim))) {
        throw new ErroPedido("Esse horário já está lotado na loja. Escolha outro horário ou uma janela maior.");
      }
    }
  }
  return agenda;
}

export async function criarAssinatura(n: {
  clienteId: string;
  planoId: string;
  endereco: { id: string; lat: number; lng: number };
  modo: "entrega" | "retirada";
  agenda: DadosAgenda;
  cascosComprar: number;
  aceite: boolean;
}): Promise<string> {
  const db = await getDb();
  const [plano] = await db.select().from(schema.planos).where(and(eq(schema.planos.id, n.planoId), eq(schema.planos.ativo, true))).limit(1);
  if (!plano) throw new ErroPedido("Este plano não está disponível.");
  const [loja] = await db.select().from(schema.lojas).where(and(eq(schema.lojas.id, plano.lojaId), eq(schema.lojas.status, "aprovada"))).limit(1);
  if (!loja) throw new ErroPedido("Esta distribuidora não está disponível.");
  const km = distanciaKm(n.endereco, loja);
  if (n.modo === "entrega" && !(loja.fazEntrega && km <= loja.raioKm)) throw new ErroPedido("Seu endereço está fora da área de entrega desta loja.");
  if (n.modo === "retirada" && !(loja.fazRetirada && km <= RAIO_RETIRADA_KM)) throw new ErroPedido("Esta loja não faz retirada para você.");

  const [ativa] = await db
    .select({ id: schema.assinaturas.id })
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.clienteId, n.clienteId), inArray(schema.assinaturas.status, ["ativa", "pausada"])))
    .limit(1);
  if (ativa) throw new ErroPedido("Você já tem um plano ativo. Para mudar, use “Trocar de plano” na sua assinatura.");

  const hoje = agoraLocal().data;
  const agenda = await prepararAgenda(loja, n.modo, n.agenda, somarDias(hoje, 1));
  const aceiteTexto = textoAceite(agenda, n.modo);
  if (!n.aceite) throw new ErroPedido("Confirme que está ciente do dia e horário das entregas.");

  return db.transaction(async (tx) => {
    const [a] = await tx
      .insert(schema.assinaturas)
      .values({
        clienteId: n.clienteId,
        lojaId: loja.id,
        planoId: plano.id,
        enderecoId: n.modo === "entrega" ? n.endereco.id : null,
        modo: n.modo,
        agenda,
        cicloInicio: agenda.primeiraData,
        formaPagamento: "na_entrega",
        aceiteTexto,
        aceiteEm: new Date(),
        cascosAComprar: Math.max(0, Math.min(n.cascosComprar, agenda.qtdPorEntrega)),
      })
      .returning();
    await gerarEntregas(tx, a.id);
    return a.id;
  });
}

async function minhaAssinatura(clienteId: string, id: string) {
  const db = await getDb();
  const [a] = await db
    .select()
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.id, id), eq(schema.assinaturas.clienteId, clienteId)))
    .limit(1);
  if (!a) throw new ErroPedido("Assinatura não encontrada.");
  return { a, db };
}

/** Muda dia/horário/quantidade. Vale a partir de amanhã (até a véspera). */
export async function alterarAgenda(clienteId: string, id: string, modo: "entrega" | "retirada", nova: DadosAgenda, aceite: boolean) {
  const { a, db } = await minhaAssinatura(clienteId, id);
  if (a.status === "cancelada") throw new ErroPedido("Esta assinatura foi cancelada.");
  const [loja] = await db.select().from(schema.lojas).where(eq(schema.lojas.id, a.lojaId)).limit(1);
  const amanha = somarDias(agoraLocal().data, 1);
  if (!aceite) throw new ErroPedido("Confirme que está ciente do novo dia e horário.");
  const agenda = await prepararAgenda(loja, modo, nova, amanha);
  await db.transaction(async (tx) => {
    await removerEntregasFuturas(tx, a.id, amanha);
    await tx
      .update(schema.assinaturas)
      .set({
        agenda,
        modo,
        aceiteTexto: textoAceite(agenda, modo),
        aceiteEm: new Date(),
        // Se o primeiro mês ainda não começou, ele passa a começar na nova primeira entrega.
        ...(a.cicloInicio > agoraLocal().data ? { cicloInicio: agenda.primeiraData } : {}),
      })
      .where(eq(schema.assinaturas.id, a.id));
    await gerarEntregas(tx, a.id);
  });
}

/** Pula (ou volta a receber) uma entrega. Só até a véspera. */
export async function alternarPulo(clienteId: string, id: string, data: string) {
  const { a, db } = await minhaAssinatura(clienteId, id);
  const amanha = somarDias(agoraLocal().data, 1);
  if (data < amanha) throw new ErroPedido("Só dá para pular até a véspera da entrega.");
  const pulando = !a.pulos.includes(data);
  await db.transaction(async (tx) => {
    const pulos = pulando ? [...a.pulos, data] : a.pulos.filter((d) => d !== data);
    await tx.update(schema.assinaturas).set({ pulos }).where(eq(schema.assinaturas.id, a.id));
    if (pulando) {
      await removerEntregasFuturas(tx, a.id, data, data);
    } else {
      await gerarEntregas(tx, a.id);
    }
  });
  return pulando;
}

/** Cancela sem multa: as entregas seguem até o fim do ciclo já pago. */
export async function cancelarAssinatura(clienteId: string, id: string) {
  const { a, db } = await minhaAssinatura(clienteId, id);
  if (a.status === "cancelada") return;
  const validaAte = fimDoCiclo(a.cicloInicio);
  await db.transaction(async (tx) => {
    await removerEntregasFuturas(tx, a.id, somarDias(validaAte, 1));
    await tx.update(schema.assinaturas).set({ status: "cancelada", canceladaEm: new Date(), validaAte }).where(eq(schema.assinaturas.id, a.id));
  });
  return validaAte;
}

/** Agenda a troca de plano para o próximo ciclo (mesma loja). */
export async function agendarTrocaPlano(clienteId: string, id: string, planoId: string | null) {
  const { a, db } = await minhaAssinatura(clienteId, id);
  if (a.status === "cancelada") throw new ErroPedido("Esta assinatura foi cancelada.");
  if (planoId) {
    const [p] = await db
      .select()
      .from(schema.planos)
      .where(and(eq(schema.planos.id, planoId), eq(schema.planos.lojaId, a.lojaId), eq(schema.planos.ativo, true)))
      .limit(1);
    if (!p) throw new ErroPedido("Plano não disponível.");
    if (p.id === a.planoId) planoId = null;
  }
  await db.update(schema.assinaturas).set({ planoProximoId: planoId }).where(eq(schema.assinaturas.id, a.id));
}
