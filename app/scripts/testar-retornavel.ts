// Teste da bebida retornável (cliente entrega o casco vazio e paga só o líquido).
// Rodar: npm run test:retornavel
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { cobrarCascosDeBebida, criarPedido } from "../src/lib/pedidos";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}

async function main() {
  process.env.PGLITE_DIR ??= "memory://";
  process.env.AGUAPRAJA_AGORA_TESTE = "2026-11-25 10:00";
  const db = await getDb();
  const [dono] = await db.insert(schema.usuarios).values({ telefone: "94900000510", papel: "loja" }).returning();
  const [cliente] = await db.insert(schema.usuarios).values({ telefone: "94900000520" }).returning();
  const [end] = await db.insert(schema.enderecos).values({ usuarioId: cliente.id, logradouro: "Rua A", bairro: "Centro", cidade: "Canaã dos Carajás", lat: -6.4966, lng: -49.8783 }).returning();
  const [loja] = await db
    .insert(schema.lojas)
    .values({
      donoId: dono.id, nome: "Loja Teste", documento: "123", telefone: "94900000510", endereco: "Rua B", bairro: "Centro", cidade: "Canaã dos Carajás",
      lat: -6.4966, lng: -49.8783, status: "aprovada", taxaEntregaCentavos: 0,
      regrasHorario: { abre: "07:00", fecha: "19:00", dias: [0, 1, 2, 3, 4, 5, 6], aceitaImediato: true, prazoImediatoMin: 60, aceitaExato: true, janelaMinimaMin: 30, capacidadePorJanela: 10, taxaExtraCentavos: 0, limiteAcumulo: 4 },
    })
    .returning();
  // Sem planos do app cadastrados = sem limites (bebidas liberadas).
  const [refri] = await db
    .insert(schema.produtos)
    .values({ lojaId: loja.id, nome: "Refrigerante 2 L vidro", categoria: "refrigerante", precoCentavos: 1200, precoLiquidoCentavos: 800 })
    .returning();

  const pedir = (trocaCasco: boolean) =>
    criarPedido({
      clienteId: cliente.id, lojaId: loja.id, enderecoId: end.id, ponto: end, modo: "entrega", tipoHorario: "periodo",
      data: "2026-11-26", inicio: "08:00", fim: "12:00", galoes: 0, cascosComprados: 0, itens: [{ produtoId: refri.id, qtd: 3, trocaCasco }], formaPagamento: "na_entrega", declarou18: false,
    });
  const ler = async (id: string) => ({
    p: (await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id)))[0],
    itens: await db.select().from(schema.itensPedido).where(eq(schema.itensPedido.pedidoId, id)),
  });

  const normal = await ler((await pedir(false)).id);
  confere("normal: 3 × R$ 12,00", normal.p.totalCentavos, 3600);
  confere("normal: não é retornável", normal.itens[0].trocaCasco, false);

  const ret = await ler((await pedir(true)).id);
  confere("retornável: 3 × R$ 8,00 (só o líquido)", ret.p.totalCentavos, 2400);
  confere("retornável: guarda o preço normal para cobrar a falta", [ret.itens[0].trocaCasco, ret.itens[0].precoCheioCentavos], [true, 1200]);
  confere("retornável: nome indica", ret.itens[0].nome.endsWith("(retornável)"), true);

  const todos = await db.transaction((tx) => cobrarCascosDeBebida(tx, ret.p.id, { [ret.itens[0].id]: 3 }));
  confere("entregou os 3 cascos: nada a mais", todos.valor, 0);
  const falta = await db.transaction((tx) => cobrarCascosDeBebida(tx, ret.p.id, { [ret.itens[0].id]: 1 }));
  confere("faltaram 2 cascos: cobra 2 × R$ 4,00", falta.valor, 800);
  confere("anota a falta no item", (await ler(ret.p.id)).itens[0].cascosFaltaram, 2);
  confere("sem informação (lote): assume que recebeu", (await db.transaction((tx) => cobrarCascosDeBebida(tx, ret.p.id, undefined))).valor, 0);

  // Produto sem preço do líquido não vira retornável mesmo se o pedido pedir.
  await db.update(schema.produtos).set({ precoLiquidoCentavos: null }).where(eq(schema.produtos.id, refri.id));
  const semOpcao = await ler((await pedir(true)).id);
  confere("loja desligou o retornável: cobra o normal", [semOpcao.p.totalCentavos, semOpcao.itens[0].trocaCasco], [3600, false]);

  // Produto excluído pela loja: some do catálogo e não pode mais ser pedido.
  await db.update(schema.produtos).set({ excluidoEm: new Date() }).where(eq(schema.produtos.id, refri.id));
  const erro = await pedir(false).then(
    () => null,
    (e: Error) => e.message,
  );
  confere("produto excluído: pedido recusado", erro, "Um dos produtos não está mais disponível.");

  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
