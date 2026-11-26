// Testes: gerador de planos pelo valor do galão e desconto/período grátis na mensalidade.
// Rodar: npm run test:gerador-beneficio
import { gerar, lerPedido, precoDoPlano, validar } from "../src/lib/gerador-planos";
import { calcularSituacao, type PlanoApp } from "../src/lib/planos-app";
import { reaisParaCentavos } from "../src/lib/validacao";

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}
const form = (campos: Record<string, string>) => lerPedido((c) => campos[c] ?? "", (s) => reaisParaCentavos(s));

// ── Gerador ──
confere("12 × R$ 7,99 = R$ 95,88", precoDoPlano(12, 799, 0), 9588);
confere("12 × R$ 7,99 + 10% = R$ 105,47", precoDoPlano(12, 799, 10), 10547);
confere("12 × R$ 8,00 + 10% = R$ 105,60", precoDoPlano(12, 800, 10), 10560);
confere("12 × R$ 7,99 − 10% = R$ 86,29", precoDoPlano(12, 799, -10), 8629);

const um = form({ modo: "um", valorGalao: "7,99", galoes: "12", sentido: "acrescimo", ajuste: "10" });
confere("um plano", gerar(um), [{ galoes: 12, precoCentavos: 10547 }]);

const varios = form({ modo: "multiplos", valorGalao: "7,99", passo: "4", inicio: "8", ate: "32", sentido: "acrescimo", ajuste: "0" });
confere("múltiplos de 4: 8 a 32", gerar(varios).map((p) => p.galoes), [8, 12, 16, 20, 24, 28, 32]);
confere("múltiplos: preço de cada", gerar(varios)[0], { galoes: 8, precoCentavos: 6392 });

const desconto = form({ modo: "multiplos", valorGalao: "10", passo: "10", inicio: "10", ate: "20", sentido: "desconto", ajuste: "5" });
confere("desconto de 5%", gerar(desconto), [
  { galoes: 10, precoCentavos: 9500 },
  { galoes: 20, precoCentavos: 19000 },
]);

confere("sem valor do galão: erro", validar(form({ modo: "um", galoes: "12" })), "Informe o valor do galão.");
confere("último menor que o primeiro: erro", !!validar(form({ modo: "multiplos", valorGalao: "8", passo: "4", inicio: "20", ate: "8" })), true);
confere("passo zero: erro", !!validar(form({ modo: "multiplos", valorGalao: "8", passo: "0", inicio: "8", ate: "32" })), true);
confere("desconto de 100%: erro", !!validar(form({ modo: "um", valorGalao: "8", galoes: "12", sentido: "desconto", ajuste: "100" })), true);
confere("no máximo 30 planos de uma vez", gerar(form({ modo: "multiplos", valorGalao: "8", passo: "1", inicio: "1", ate: "300" })).length, 30);

// ── Desconto e grátis na mensalidade ──
const completo = { id: "c", nome: "Completo", precoCentavos: 9990, ativo: true, ordem: 2, limiteAssinantes: null, limiteEntregadores: null, pagamentoOnline: true, produtosExtras: true, appProprio: true } as unknown as PlanoApp;
const planos = [completo];
const hoje = "2026-12-01";
const base = { planoAppId: "c", planoAppPagoAte: null as string | null };

const semNada = calcularSituacao(base, planos, hoje);
confere("sem pagar e sem benefício: vencido, valor cheio", [semNada.vencido, semNada.valorCentavos], [true, 9990]);

const desc = calcularSituacao({ ...base, planoAppPagoAte: "2026-12-20", descontoMensalidade: 50 }, planos, hoje);
confere("50% sem prazo: R$ 49,95", [desc.valorCentavos, desc.desconto], [4995, { percentual: 50, ate: null }]);

const descVencido = calcularSituacao({ ...base, planoAppPagoAte: "2026-12-20", descontoMensalidade: 50, descontoAte: "2026-11-30" }, planos, hoje);
confere("desconto que acabou: volta ao cheio", [descVencido.valorCentavos, descVencido.desconto], [9990, null]);

const gratis = calcularSituacao({ ...base, gratisAte: "2026-12-31" }, planos, hoje);
confere("grátis até: plano vale sem pagar", [gratis.vencido, gratis.vigente?.nome, gratis.valorCentavos, gratis.gratisAte], [false, "Completo", 0, "2026-12-31"]);

const gratisAcabou = calcularSituacao({ ...base, gratisAte: "2026-11-30" }, planos, hoje);
confere("grátis que acabou: volta a cobrar", [gratisAcabou.vencido, gratisAcabou.valorCentavos], [true, 9990]);

const cem = calcularSituacao({ ...base, descontoMensalidade: 100 }, planos, hoje);
confere("100% de desconto: vale sem registrar pagamento", [cem.vencido, cem.valorCentavos], [false, 0]);

console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
