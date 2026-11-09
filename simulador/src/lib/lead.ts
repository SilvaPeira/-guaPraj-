// Formato do cadastro de interesse (o que vai para a planilha).

export const BEBIDAS = [
  { id: "agua_garrafa", nome: "Água em garrafinha / fardo" },
  { id: "refrigerante", nome: "Refrigerante" },
  { id: "suco", nome: "Suco / isotônico / energético" },
  { id: "gelo", nome: "Gelo" },
  { id: "polpa", nome: "Polpa de fruta / açaí" },
  { id: "cerveja", nome: "Cerveja e bebidas alcoólicas (18+)" },
] as const;

export type BebidaId = (typeof BEBIDAS)[number]["id"];
export const BEBIDA_ALCOOLICA: BebidaId = "cerveja";

export const ASSINARIA = ["sim", "talvez", "nao"] as const;
export const PAGAMENTOS = ["pix_mensal", "cartao", "na_entrega"] as const;
export const HORARIOS = ["manha", "tarde", "horario_exato", "qualquer"] as const;
export const FICOU_SEM_AGUA = ["nunca", "as_vezes", "sempre"] as const;
export const COMO_COMPRA = ["whatsapp", "ligacao", "busca_na_loja", "outro"] as const;

export type Lead = {
  nome: string;
  whatsapp: string;
  bairro: string;
  // simulador
  adultos: number;
  criancas: number;
  bebes: number;
  adolescentes: number;
  idosos: number;
  calor: boolean;
  cozinha: boolean;
  galoesMesSimulado: number;
  planoSugerido: number;
  // hábito atual (validação)
  galoesSemanaHoje: number | null;
  precoGalaoHoje: number | null;
  comoCompra: (typeof COMO_COMPRA)[number] | "";
  ficouSemAgua: (typeof FICOU_SEM_AGUA)[number] | "";
  // interesse
  assinaria: (typeof ASSINARIA)[number];
  pagamento: (typeof PAGAMENTOS)[number] | "";
  horario: (typeof HORARIOS)[number] | "";
  bebidas: BebidaId[];
  maiorDe18: boolean;
  consentimento: boolean;
  origem: string;
};

const s = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown, min = 0, max = 50) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : 0;
};
const nOuNull = (v: unknown, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) && x >= 0 && x <= max ? x : null;
};
const um = <T extends readonly string[]>(lista: T, v: unknown): T[number] | "" =>
  (lista as readonly string[]).includes(v as string) ? (v as T[number]) : "";

export function somenteDigitos(tel: string) {
  return tel.replace(/\D/g, "");
}

/** Valida e limpa o corpo recebido. Retorna a mensagem de erro ou o lead. */
export function validarLead(body: unknown): { erro: string } | { lead: Lead } {
  if (!body || typeof body !== "object") return { erro: "Dados inválidos." };
  const b = body as Record<string, unknown>;

  const nome = s(b.nome, 80);
  const whatsapp = somenteDigitos(s(b.whatsapp, 30));
  const bairro = s(b.bairro, 80);
  if (nome.length < 2) return { erro: "Informe seu nome." };
  if (whatsapp.length < 10 || whatsapp.length > 13) return { erro: "Informe um WhatsApp com DDD." };
  if (!bairro) return { erro: "Informe seu bairro." };
  if (b.consentimento !== true) return { erro: "É preciso aceitar o uso dos dados para contato." };

  const assinaria = um(ASSINARIA, b.assinaria);
  if (!assinaria) return { erro: "Diga se você assinaria um plano." };

  const bebidasValidas = new Set<string>(BEBIDAS.map((x) => x.id));
  let bebidas = Array.isArray(b.bebidas)
    ? [...new Set(b.bebidas.filter((x): x is BebidaId => typeof x === "string" && bebidasValidas.has(x)))]
    : [];
  const maiorDe18 = b.maiorDe18 === true;
  // bebida alcoólica só é registrada com a declaração de 18+
  if (!maiorDe18) bebidas = bebidas.filter((x) => x !== BEBIDA_ALCOOLICA);

  const lead: Lead = {
    nome,
    whatsapp,
    bairro,
    adultos: n(b.adultos),
    criancas: n(b.criancas),
    bebes: n(b.bebes),
    adolescentes: n(b.adolescentes),
    idosos: n(b.idosos),
    calor: b.calor === true,
    cozinha: b.cozinha === true,
    galoesMesSimulado: n(b.galoesMesSimulado, 0, 500),
    planoSugerido: n(b.planoSugerido, 0, 500),
    galoesSemanaHoje: nOuNull(b.galoesSemanaHoje, 100),
    precoGalaoHoje: nOuNull(b.precoGalaoHoje, 200),
    comoCompra: um(COMO_COMPRA, b.comoCompra),
    ficouSemAgua: um(FICOU_SEM_AGUA, b.ficouSemAgua),
    assinaria,
    pagamento: um(PAGAMENTOS, b.pagamento),
    horario: um(HORARIOS, b.horario),
    bebidas,
    maiorDe18,
    consentimento: true,
    origem: s(b.origem, 60),
  };
  if (lead.adultos + lead.criancas + lead.bebes + lead.adolescentes + lead.idosos === 0) {
    return { erro: "Informe quantas pessoas moram na casa." };
  }
  return { lead };
}
