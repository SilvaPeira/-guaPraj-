// Teste automático do pagamento online (etapa 6) — banco em memória, sem rede.
// Rodar: npm run test:pagamento
//
//  1. Tokens cifrados voltam iguais e não aparecem em texto puro
//  2. "state" do OAuth: válido, adulterado, vencido
//  3. Assinatura do aviso do Mercado Pago (x-signature)
//  4. Taxa da plataforma
//  5. Pedido pago (modo teste) é idempotente; cliente cancela → valor devolvido
//  6. Loja cancela pedido pago → valor devolvido

import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { cancelarPedidoCliente, criarPedido } from "../src/lib/pedidos";
import { aceitaOnline, assinaturaValida, cifrar, conectarSimulado, decifrar, estadoOAuth, estornarCancelados, lerEstadoOAuth, podePagarOnline, registrarPago, taxaPlataforma } from "../src/lib/mercadopago";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}

async function main() {
  process.env.PGLITE_DIR ??= "memory://";
  process.env.AGUAPRAJA_AGORA_TESTE = "2026-11-24 10:00";

  // 1
  const c = cifrar("APP_USR-segredo");
  confere("cifra ida e volta", decifrar(c), "APP_USR-segredo");
  confere("token não fica legível", c.includes("segredo"), false);

  // 2
  const agora = Date.now();
  const lojaFake = "11111111-1111-1111-1111-111111111111";
  confere("state válido", lerEstadoOAuth(estadoOAuth(lojaFake, agora), agora), lojaFake);
  confere("state adulterado", lerEstadoOAuth(estadoOAuth(lojaFake, agora).replace("1111", "2222"), agora), null);
  confere("state vencido (2 h)", lerEstadoOAuth(estadoOAuth(lojaFake, agora), agora + 7200_000), null);

  // 3
  const seg = "segredo-webhook";
  const v1 = createHmac("sha256", seg).update("id:123456;request-id:req-1;ts:1700000000;").digest("hex");
  confere("x-signature correta", assinaturaValida(`ts=1700000000,v1=${v1}`, "req-1", "123456", seg), true);
  confere("x-signature de outro pagamento", assinaturaValida(`ts=1700000000,v1=${v1}`, "req-1", "999999", seg), false);
  confere("sem cabeçalho com segredo configurado", assinaturaValida(null, null, "123456", seg), false);

  // 4
  delete process.env.TAXA_PLATAFORMA_PERCENTUAL;
  confere("sem taxa configurada", taxaPlataforma(10000), 0);
  process.env.TAXA_PLATAFORMA_PERCENTUAL = "2.5";
  confere("2,5% de R$ 39,90", taxaPlataforma(3990), 100);
  delete process.env.TAXA_PLATAFORMA_PERCENTUAL;

  // 5 e 6
  const db = await getDb();
  const [dono] = await db.insert(schema.usuarios).values({ telefone: "94900000110", nome: "Dono", papel: "loja" }).returning();
  const [cliente] = await db.insert(schema.usuarios).values({ telefone: "94900000120", nome: "Cliente" }).returning();
  const [end] = await db
    .insert(schema.enderecos)
    .values({ usuarioId: cliente.id, logradouro: "Rua A", bairro: "Centro", cidade: "Canaã dos Carajás", lat: -6.4966, lng: -49.8783 })
    .returning();
  const [loja] = await db
    .insert(schema.lojas)
    .values({
      donoId: dono.id, nome: "Loja Teste", documento: "123", telefone: "94900000110", endereco: "Rua B", bairro: "Centro", cidade: "Canaã dos Carajás",
      lat: -6.4966, lng: -49.8783, status: "aprovada", taxaEntregaCentavos: 300,
      regrasHorario: { abre: "07:00", fecha: "19:00", dias: [0, 1, 2, 3, 4, 5, 6], aceitaImediato: true, prazoImediatoMin: 60, aceitaExato: true, janelaMinimaMin: 30, capacidadePorJanela: 10, taxaExtraCentavos: 0, limiteAcumulo: 4 },
    })
    .returning();
  await db.insert(schema.produtos).values({ lojaId: loja.id, nome: "Galão 20 L", categoria: "agua_galao", retornavel: true, precoCentavos: 1500 });

  confere("sem conta conectada não aceita online", await aceitaOnline(loja.id), false);
  await conectarSimulado(loja.id);
  confere("conta de teste conectada aceita online", await aceitaOnline(loja.id), true);

  const novo = () =>
    criarPedido({
      clienteId: cliente.id, lojaId: loja.id, enderecoId: end.id, ponto: end, modo: "entrega", tipoHorario: "periodo",
      data: "2026-11-25", inicio: "08:00", fim: "12:00", galoes: 2, cascosComprados: 0, itens: [], formaPagamento: "online", declarou18: false,
    });
  const ler = async (id: string) => (await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id)))[0];

  const a = await novo();
  confere("pedido nasce pendente e pagável", podePagarOnline(await ler(a.id)), true);
  confere("1º aviso de pago marca", await registrarPago(a.id, "sim-1", "pix"), true);
  confere("aviso repetido não marca de novo", await registrarPago(a.id, "sim-1", "pix"), false);
  let pa = await ler(a.id);
  confere("pago com Pix", [pa.statusPagamento, pa.pagamentoMeio, pa.totalCentavos], ["pago", "pix", 3300]);
  confere("pedido pago não é pagável de novo", podePagarOnline(pa), false);
  await cancelarPedidoCliente(cliente.id, a.id);
  pa = await ler(a.id);
  confere("cliente cancela → devolvido", [pa.status, pa.statusPagamento], ["cancelado", "estornado"]);
  confere("devolvido não volta a ficar pago", await registrarPago(a.id, "sim-1", "pix"), false);

  const b = await novo();
  await registrarPago(b.id, "sim-2", "cartao");
  // (mudarStatus da loja chama estornarCancelados com os pedidos que cancelou)
  await db.update(schema.pedidos).set({ status: "cancelado", motivo: "Sem estoque" }).where(eq(schema.pedidos.id, b.id));
  await estornarCancelados([b.id]);
  const pb = await ler(b.id);
  confere("loja cancela pago → devolvido", [pb.status, pb.statusPagamento], ["cancelado", "estornado"]);

  const c2 = await novo();
  await db.update(schema.pedidos).set({ status: "cancelado" }).where(eq(schema.pedidos.id, c2.id));
  await estornarCancelados([c2.id]);
  confere("cancelar não pago não mexe no pagamento", (await ler(c2.id)).statusPagamento, "pendente");

  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
