// Teste dos planos do ÁguaPrajá para as distribuidoras. Rodar: npm run test:planos-app
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { aceitaNovoAssinante, calcularSituacao, PLANOS_APP_SUGERIDOS, recursosDaLoja, type PlanoApp } from "../src/lib/planos-app";
import { aceitaOnline, conectarSimulado } from "../src/lib/mercadopago";
import { criarPedido, ErroPedido } from "../src/lib/pedidos";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}

async function main() {
  process.env.PGLITE_DIR ??= "memory://";
  process.env.AGUAPRAJA_AGORA_TESTE = "2026-11-25 10:00";

  // Regras puras
  const planos = PLANOS_APP_SUGERIDOS.map((p, i) => ({ ...p, id: `p${i}`, ativo: true, criadoEm: new Date() }) as PlanoApp);
  confere("sem planos cadastrados: sem limites", calcularSituacao({ planoAppId: null, planoAppPagoAte: null }, [], "2026-11-25").recursos.limiteAssinantes, null);
  const sem = calcularSituacao({ planoAppId: null, planoAppPagoAte: null }, planos, "2026-11-25");
  confere("sem plano pago: regras básicas, sem app próprio", [sem.vigente, sem.recursos.limiteAssinantes, sem.recursos.appProprio], [null, 15, false]);
  const pago = calcularSituacao({ planoAppId: "p1", planoAppPagoAte: "2026-12-01" }, planos, "2026-11-25");
  confere("Completo pago em dia vale, com app próprio", [pago.vigente?.nome, pago.vencido, pago.recursos.appProprio], ["Completo", false, true]);
  const venc = calcularSituacao({ planoAppId: "p1", planoAppPagoAte: "2026-11-24" }, planos, "2026-11-25");
  confere("Completo vencido volta ao básico", [venc.vigente, venc.vencido, venc.recursos.appProprio], [null, true, false]);
  const ess = calcularSituacao({ planoAppId: "p0", planoAppPagoAte: "2026-11-25" }, planos, "2026-11-25");
  confere("Essencial (último dia pago) vale, sem app próprio", [ess.vigente?.nome, ess.recursos.appProprio], ["Essencial", false]);

  // No banco
  const db = await getDb();
  await db.insert(schema.planosApp).values(PLANOS_APP_SUGERIDOS);
  const todos = await db.select().from(schema.planosApp);
  const essencial = todos.find((p) => p.nome === "Essencial")!;
  const completo = todos.find((p) => p.nome === "Completo")!;
  const [dono] = await db.insert(schema.usuarios).values({ telefone: "94900000410", papel: "loja" }).returning();
  const [cliente] = await db.insert(schema.usuarios).values({ telefone: "94900000420" }).returning();
  const [end] = await db.insert(schema.enderecos).values({ usuarioId: cliente.id, logradouro: "Rua A", bairro: "Centro", cidade: "Canaã dos Carajás", lat: -6.4966, lng: -49.8783 }).returning();
  const [loja] = await db
    .insert(schema.lojas)
    .values({
      donoId: dono.id, nome: "Loja Teste", documento: "123", telefone: "94900000410", endereco: "Rua B", bairro: "Centro", cidade: "Canaã dos Carajás",
      lat: -6.4966, lng: -49.8783, status: "aprovada",
      regrasHorario: { abre: "07:00", fecha: "19:00", dias: [0, 1, 2, 3, 4, 5, 6], aceitaImediato: true, prazoImediatoMin: 60, aceitaExato: true, janelaMinimaMin: 30, capacidadePorJanela: 10, taxaExtraCentavos: 0, limiteAcumulo: 4 },
    })
    .returning();
  await db.insert(schema.produtos).values({ lojaId: loja.id, nome: "Galão 20 L", categoria: "agua_galao", retornavel: true, precoCentavos: 1500 });
  const [refri] = await db.insert(schema.produtos).values({ lojaId: loja.id, nome: "Refri 2 L", categoria: "refrigerante", precoCentavos: 1000 }).returning();
  await conectarSimulado(loja.id);

  confere("sem plano: sem pagamento online", await aceitaOnline(loja.id), false);
  const pedirRefri = () =>
    criarPedido({
      clienteId: cliente.id, lojaId: loja.id, enderecoId: end.id, ponto: end, modo: "entrega", tipoHorario: "periodo",
      data: "2026-11-26", inicio: "08:00", fim: "12:00", galoes: 0, cascosComprados: 0, itens: [{ produtoId: refri.id, qtd: 1 }], formaPagamento: "na_entrega", declarou18: false,
    });
  let erro = "";
  try {
    await pedirRefri();
  } catch (e) {
    erro = e instanceof ErroPedido ? "recusado" : String(e);
  }
  confere("sem plano: refrigerante recusado", erro, "recusado");

  await db.update(schema.lojas).set({ planoAppId: essencial.id, planoAppPagoAte: "2026-12-24" }).where(eq(schema.lojas.id, loja.id));
  confere("Essencial: pagamento online liberado", await aceitaOnline(loja.id), true);
  confere("Essencial: aceita assinante (limite 100)", await aceitaNovoAssinante(loja.id), true);
  confere("Essencial: sem app próprio", (await recursosDaLoja(loja.id)).appProprio, false);

  await db.update(schema.lojas).set({ planoAppId: completo.id, planoAppPagoAte: "2026-12-24" }).where(eq(schema.lojas.id, loja.id));
  confere("Completo: app próprio liberado", (await recursosDaLoja(loja.id)).appProprio, true);
  confere("Completo: pedido com refrigerante passa", !!(await pedirRefri()).id, true);

  await db.update(schema.lojas).set({ planoAppPagoAte: "2026-11-01" }).where(eq(schema.lojas.id, loja.id));
  const r = await recursosDaLoja(loja.id);
  confere("Completo vencido: perde app próprio e bebidas", [r.appProprio, r.produtosExtras], [false, false]);

  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
