// Testes: avisos no app, exclusão de conta (LGPD) e registro de erros.
// Rodar: npm run test:avisos-conta
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { avisosDe, marcarLidos, naoLidos, notificar } from "../src/lib/notificar";
import { ErroConta, excluirConta } from "../src/lib/conta";
import { gerarHash } from "../src/lib/senha";
import { errosAgrupados, errosRecentes, registrarErro } from "../src/lib/erros";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}
async function erroDe(f: () => Promise<unknown>): Promise<string | null> {
  try {
    await f();
    return null;
  } catch (e) {
    return e instanceof ErroConta ? e.message : `inesperado: ${(e as Error).message}`;
  }
}

async function main() {
  process.env.PGLITE_DIR ??= "memory://";
  const db = await getDb();
  const senha = "senha-123";
  const [cli] = await db.insert(schema.usuarios).values({ telefone: "94900000901", nome: "Ana", senhaHash: await gerarHash(senha) }).returning();
  const [end] = await db.insert(schema.enderecos).values({ usuarioId: cli.id, logradouro: "Rua A", numero: "10", bairro: "Centro", cidade: "Canaã dos Carajás", lat: -6.5, lng: -49.9 }).returning();

  // ── Avisos ──
  await notificar(cli.id, { titulo: "Loja", texto: "Pedido confirmado", link: "/pedidos/x" });
  await notificar(cli.id, { titulo: "Loja", texto: "Saiu para entrega" });
  confere("avisos guardados", (await avisosDe(cli.id)).map((a) => a.texto).sort(), ["Pedido confirmado", "Saiu para entrega"]);
  confere("2 não lidos", await naoLidos(cli.id), 2);
  await marcarLidos(cli.id);
  confere("marcar como visto zera", await naoLidos(cli.id), 0);
  await notificar(null, { titulo: "x", texto: "sem usuário" }); // não quebra
  confere("sem usuário não grava nada", (await db.select().from(schema.avisos)).length, 2);

  // ── Exclusão de conta ──
  confere("senha errada", await erroDe(() => excluirConta(cli.id, "errada")), "Senha errada.");
  const [loja] = await db.insert(schema.usuarios).values({ telefone: "94900000902", papel: "loja", senhaHash: await gerarHash(senha) }).returning();
  confere("loja não se exclui pelo app", await erroDe(() => excluirConta(loja.id, senha)), "Contas de loja, entregador ou admin são encerradas pelo suporte.");

  const [donoLoja] = await db.insert(schema.usuarios).values({ telefone: "94900000903", papel: "loja" }).returning();
  const [l] = await db
    .insert(schema.lojas)
    .values({
      donoId: donoLoja.id, nome: "L", documento: "1", telefone: "94900000903", endereco: "x", bairro: "Centro", cidade: "Canaã dos Carajás", lat: -6.5, lng: -49.9, status: "aprovada",
      regrasHorario: { abre: "07:00", fecha: "19:00", dias: [0, 1, 2, 3, 4, 5, 6], aceitaImediato: true, prazoImediatoMin: 60, aceitaExato: true, janelaMinimaMin: 30, capacidadePorJanela: 10, taxaExtraCentavos: 0 },
    })
    .returning();
  const [ped] = await db
    .insert(schema.pedidos)
    .values({ clienteId: cli.id, lojaId: l.id, enderecoId: end.id, numero: 7, modo: "entrega", tipoHorario: "periodo", data: "2026-12-01", horaInicio: "08:00", horaFim: "12:00", status: "confirmado", origem: "avulso", subtotalCentavos: 1000, totalCentavos: 1000, formaPagamento: "na_entrega" })
    .returning();
  confere("pedido em andamento bloqueia", await erroDe(() => excluirConta(cli.id, senha)), "Você tem o pedido #7 em andamento. Espere a entrega (ou cancele o pedido) e tente de novo.");
  await db.update(schema.pedidos).set({ status: "entregue" }).where(eq(schema.pedidos.id, ped.id));

  confere("exclui", await erroDe(() => excluirConta(cli.id, senha)), null);
  const [depois] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, cli.id));
  confere("nome, senha e celular apagados", [depois.nome, depois.senhaHash, depois.telefone.startsWith("excluido:"), !!depois.excluidoEm], [null, null, true, true]);
  const [endDepois] = await db.select().from(schema.enderecos).where(eq(schema.enderecos.id, end.id));
  confere("endereço sem rua, número e mapa", [endDepois.logradouro, endDepois.numero, endDepois.lat, endDepois.lng], ["(removido)", null, 0, 0]);
  confere("avisos apagados", (await avisosDe(cli.id)).length, 0);
  confere("pedido antigo continua com a loja", (await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, ped.id))).length, 1);
  const [novo] = await db.insert(schema.usuarios).values({ telefone: "94900000901" }).returning();
  confere("celular livre para conta nova", !!novo.id, true);
  confere("excluir de novo: não encontrada", await erroDe(() => excluirConta(cli.id, senha)), "Conta não encontrada.");

  // ── Erros do servidor ──
  await registrarErro({ mensagem: "boom", rota: "/entrar/nova-senha?tel=94999990000&t=TOKEN-SECRETO", metodo: "POST", tipo: "action", digest: "123" });
  await registrarErro({ mensagem: "boom", rota: "/entrar/nova-senha?t=OUTRO", metodo: "POST", tipo: "action" });
  const grupos = await errosAgrupados();
  confere("agrupa a mesma falha", [grupos.length, grupos[0].vezes], [1, 2]);
  confere("nunca guarda o que vem depois do ?", grupos[0].rota, "/entrar/nova-senha");
  confere("conta nas últimas 24 h", await errosRecentes(24), 2);

  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
