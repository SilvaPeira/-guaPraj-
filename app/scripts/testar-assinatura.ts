// Teste automático das regras de dinheiro do plano (banco em memória, relógio simulado).
// Rodar: npm run test:assinatura
//
// Cenários:
//  1. Mensalidade na 1ª entrega de cada mês
//  2. Agenda acima do plano → "galão além do plano" cobrado na entrega que estoura
//  3. Sobra do mês vira saldo (até o limite da loja)
//  4. Compra adicional usa o saldo sem custo; cancelar devolve o saldo
//  5. Pausar e reativar depois do fim do mês → novo mês começa na próxima entrega
//  6. Cascos comprados sobrevivem à troca de dia

import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { alterarAgenda, criarAssinatura, pausarAssinatura, reativarAssinatura } from "../src/lib/assinaturas";
import { cancelarPedidoCliente, criarPedido, gerarEntregas } from "../src/lib/pedidos";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}
const relogio = (agora: string) => (process.env.AGUAPRAJA_AGORA_TESTE = agora);

async function montar() {
  const db = await getDb();
  const [dono] = await db.insert(schema.usuarios).values({ telefone: "94900000010", nome: "Dono", papel: "loja" }).returning();
  const [cliente] = await db.insert(schema.usuarios).values({ telefone: "94900000020", nome: "Cliente" }).returning();
  const [end] = await db
    .insert(schema.enderecos)
    .values({ usuarioId: cliente.id, logradouro: "Rua A", bairro: "Centro", cidade: "Canaã dos Carajás", lat: -6.4966, lng: -49.8783 })
    .returning();
  const [loja] = await db
    .insert(schema.lojas)
    .values({
      donoId: dono.id,
      nome: "Loja Teste",
      documento: "123",
      telefone: "94900000010",
      endereco: "Rua B",
      bairro: "Centro",
      cidade: "Canaã dos Carajás",
      lat: -6.4966,
      lng: -49.8783,
      status: "aprovada",
      regrasHorario: { abre: "07:00", fecha: "19:00", dias: [0, 1, 2, 3, 4, 5, 6], aceitaImediato: true, prazoImediatoMin: 60, aceitaExato: true, janelaMinimaMin: 30, capacidadePorJanela: 10, taxaExtraCentavos: 0, limiteAcumulo: 4 },
    })
    .returning();
  const [galao] = await db.insert(schema.produtos).values({ lojaId: loja.id, nome: "Galão 20 L", categoria: "agua_galao", retornavel: true, precoCentavos: 1500 }).returning();
  await db.insert(schema.produtos).values({ lojaId: loja.id, nome: "Casco", categoria: "casco", precoCentavos: 2500 });
  const [plano] = await db.insert(schema.planos).values({ lojaId: loja.id, produtoId: galao.id, galoesMes: 20, precoCentavos: 27000 }).returning();
  return { db, cliente, end, loja, plano };
}

async function entregas(assinaturaId: string) {
  const db = await getDb();
  const ps = await db.select().from(schema.pedidos).where(and(eq(schema.pedidos.assinaturaId, assinaturaId), eq(schema.pedidos.origem, "plano"))).orderBy(asc(schema.pedidos.data));
  const out = [];
  for (const p of ps) {
    const itens = await db.select().from(schema.itensPedido).where(eq(schema.itensPedido.pedidoId, p.id));
    out.push({ data: p.data, status: p.status, total: p.totalCentavos, itens: itens.map((i) => `${i.qtd}x ${i.nome} @${i.precoUnitCentavos}`) });
  }
  return out;
}

async function main() {
  process.env.PGLITE_DIR ??= "memory://"; // banco descartável (lido só na 1ª conexão)
  const { db, cliente, end, plano } = await montar();
  const agenda = (qtd: number, dias = [1]) => ({ frequencia: "semanal" as const, dias, qtdPorEntrega: qtd, tipoHorario: "exato" as const, inicio: "09:00", fim: "09:00" });

  // ── 1 e 2: 5 galões toda segunda (25/mês num plano de 20), comprando 2 cascos ──
  relogio("2026-11-17 10:00"); // terça
  const id = await criarAssinatura({ clienteId: cliente.id, planoId: plano.id, endereco: end, modo: "entrega", agenda: agenda(5), cascosComprar: 2, aceite: true });
  await gerarEntregas(db, id, "2026-12-31");
  let es = await entregas(id);
  confere("1ª entrega em 23/11", es[0].data, "2026-11-23");
  confere("1ª entrega: mensalidade + 2 cascos", es[0].total, 27000 + 2 * 2500);
  confere("2ª entrega sem cobrança", es[1].total, 0);
  confere("5ª entrega do mês (21/12) cobra 5 galões além do plano a R$ 13,50", es[4].total, 5 * 1350);
  confere("1ª entrega do mês seguinte (28/12) cobra a mensalidade", es.find((e) => e.data === "2026-12-28")?.total, 27000);

  // ── 6: trocar para quinta mantém mensalidade e cascos na nova 1ª entrega ──
  await alterarAgenda(cliente.id, id, "entrega", agenda(4, [4]), true);
  await gerarEntregas(db, id, "2026-12-31");
  es = await entregas(id);
  confere("após trocar o dia, 1ª entrega é quinta 19/11", es[0].data, "2026-11-19");
  confere("…e continua com mensalidade + cascos", es[0].total, 27000 + 2 * 2500);
  const [aTroca] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, id));
  confere("o mês passa a começar em 19/11", aTroca.cicloInicio, "2026-11-19");

  // ── 3: 4 galões × 5 quintas (19/11…17/12) = 20 → sem sobra. Pula 2 → sobram 8, saldo limitado a 4 ──
  await db.update(schema.pedidos).set({ status: "cancelado" }).where(and(eq(schema.pedidos.assinaturaId, id), eq(schema.pedidos.data, "2026-11-26")));
  await db.update(schema.pedidos).set({ status: "cancelado" }).where(and(eq(schema.pedidos.assinaturaId, id), eq(schema.pedidos.data, "2026-12-03")));
  relogio("2026-12-20 10:00"); // depois do fim do mês (18/12)
  await gerarEntregas(db, id);
  const [aSaldo] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, id));
  confere("novo mês começa em 19/12", aSaldo.cicloInicio, "2026-12-19");
  confere("sobra de 8 vira saldo limitado a 4", aSaldo.saldoAcumulado, 4);

  // ── 4: compra adicional de 3 galões sai do saldo; cancelar devolve ──
  const extra = await criarPedido({
    clienteId: cliente.id, lojaId: aSaldo.lojaId, enderecoId: end.id, ponto: end, modo: "entrega", tipoHorario: "periodo",
    data: "2026-12-22", inicio: "08:00", fim: "12:00", galoes: 3, cascosComprados: 0, itens: [], formaPagamento: "na_entrega", declarou18: false, assinaturaId: id,
  });
  const [pExtra] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, extra.id));
  confere("extra de 3 galões do saldo sai sem custo (sem taxa)", pExtra.totalCentavos, 0);
  let [aDepois] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, id));
  confere("saldo cai para 1", aDepois.saldoAcumulado, 1);
  await cancelarPedidoCliente(cliente.id, extra.id);
  [aDepois] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, id));
  confere("cancelar devolve o saldo (volta a 4)", aDepois.saldoAcumulado, 4);

  // ── 5: pausar e reativar depois do fim do mês ──
  await pausarAssinatura(cliente.id, id);
  relogio("2027-02-03 10:00"); // quarta, mês pago (19/12–18/01) já acabou
  await reativarAssinatura(cliente.id, id);
  const [aVolta] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, id));
  confere("reativado", aVolta.status, "ativa");
  confere("novo mês começa na próxima quinta (04/02)", aVolta.cicloInicio, "2027-02-04");
  es = await entregas(id);
  confere("entrega de 04/02 cobra a mensalidade", es.find((e) => e.data === "2027-02-04")?.total, 27000);

  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
