/**
 * ÁguaPrajá — recebe os cadastros do simulador e grava na planilha.
 *
 * Como instalar (5 minutos):
 * 1. Crie uma Planilha Google nova (ex.: "ÁguaPrajá — Interessados").
 * 2. Menu Extensões > Apps Script. Apague o conteúdo e cole este arquivo inteiro.
 * 3. Troque o SEGREDO abaixo por uma senha qualquer (a mesma vai na variável PLANILHA_SEGREDO).
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL gerada (termina em /exec) e coloque em PLANILHA_WEBHOOK_URL.
 */

const SEGREDO = "troque-esta-senha";
const ABA = "Interessados";

const COLUNAS = [
  ["recebidoEm", "Recebido em"],
  ["nome", "Nome"],
  ["whatsapp", "WhatsApp"],
  ["bairro", "Bairro"],
  ["adultos", "Adultos"],
  ["criancas", "Crianças"],
  ["adolescentes", "Adolescentes"],
  ["idosos", "Idosos"],
  ["bebes", "Bebês"],
  ["cozinha", "Usa p/ cozinhar"],
  ["calor", "Ajuste calor"],
  ["galoesMesSimulado", "Galões/mês (simulado)"],
  ["planoSugerido", "Plano sugerido"],
  ["galoesSemanaHoje", "Galões/semana hoje"],
  ["precoGalaoHoje", "Preço galão hoje (R$)"],
  ["comoCompra", "Como compra hoje"],
  ["ficouSemAgua", "Já ficou sem água"],
  ["assinaria", "Assinaria plano"],
  ["pagamento", "Pagamento preferido"],
  ["horario", "Horário preferido"],
  ["bebidas", "Bebidas de interesse"],
  ["maiorDe18", "Declarou 18+"],
  ["origem", "Origem (QR/link)"],
];

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    if (dados.segredo !== SEGREDO) return resposta({ ok: false, erro: "segredo inválido" });

    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const aba = planilha.getSheetByName(ABA) || planilha.insertSheet(ABA);
    if (aba.getLastRow() === 0) {
      aba.appendRow(COLUNAS.map((c) => c[1]));
      aba.setFrozenRows(1);
    }
    const r = dados.registro || {};
    const linha = COLUNAS.map(([chave]) => {
      const v = r[chave];
      if (v === true) return "sim";
      if (v === false) return "não";
      if (v === null || v === undefined) return "";
      // evita que o Sheets trate texto começando com = + - @ como fórmula
      return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    aba.appendRow(linha);
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
