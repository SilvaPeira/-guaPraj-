/**
 * Pix da loja: chave (com validação por tipo) e "Pix copia e cola" com o valor do pedido.
 * O "copia e cola" segue o BR Code do Banco Central (EMV, QR estático) com CRC16-CCITT.
 * Funciona em qualquer banco; o dinheiro cai direto na conta da loja (o ÁguaPrajá não passa por ele).
 */

export type TipoChavePix = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

export const TIPOS_PIX: { tipo: TipoChavePix; nome: string; exemplo: string }[] = [
  { tipo: "cnpj", nome: "CNPJ", exemplo: "12.345.678/0001-99" },
  { tipo: "cpf", nome: "CPF", exemplo: "123.456.789-09" },
  { tipo: "telefone", nome: "Celular", exemplo: "(94) 9 9999-9999" },
  { tipo: "email", nome: "E-mail", exemplo: "pix@minhaloja.com" },
  { tipo: "aleatoria", nome: "Chave aleatória", exemplo: "123e4567-e89b-12d3-a456-426614174000" },
];

const digitos = (s: string) => s.replace(/\D/g, "");

function cpfValido(c: string): boolean {
  if (!/^\d{11}$/.test(c) || /^(\d)\1+$/.test(c)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

function cnpjValido(c: string): boolean {
  if (!/^\d{14}$/.test(c) || /^(\d)\1+$/.test(c)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((t, p, i) => t + p * Number(c[i]), 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

/** Confere e deixa a chave no formato que os bancos usam. */
export function normalizarChavePix(tipo: string, valor: string): { ok: true; chave: string } | { ok: false; erro: string } {
  const v = valor.trim();
  switch (tipo) {
    case "cpf": {
      const d = digitos(v);
      return cpfValido(d) ? { ok: true, chave: d } : { ok: false, erro: "CPF inválido. Confira os números." };
    }
    case "cnpj": {
      const d = digitos(v);
      return cnpjValido(d) ? { ok: true, chave: d } : { ok: false, erro: "CNPJ inválido. Confira os números." };
    }
    case "telefone": {
      let d = digitos(v);
      if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
      return d.length === 10 || d.length === 11 ? { ok: true, chave: `+55${d}` } : { ok: false, erro: "Celular inválido: use DDD + número." };
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 77 ? { ok: true, chave: v.toLowerCase() } : { ok: false, erro: "E-mail inválido." };
    case "aleatoria":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? { ok: true, chave: v.toLowerCase() } : { ok: false, erro: "Chave aleatória inválida (é um código com 32 letras e números)." };
    default:
      return { ok: false, erro: "Escolha o tipo da chave." };
  }
}

/** Como mostrar a chave para o cliente (CNPJ com pontos, celular com DDD…). */
export function chaveLegivel(tipo: string, chave: string): string {
  if (tipo === "cpf" && /^\d{11}$/.test(chave)) return chave.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (tipo === "cnpj" && /^\d{14}$/.test(chave)) return chave.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (tipo === "telefone") {
    const d = chave.replace(/^\+55/, "");
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return chave;
}

/** Sem acento, maiúsculo, só letras/números/espaço (o BR Code pede ASCII). */
function ascii(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como pede o BR Code. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * "Pix copia e cola" (BR Code estático) com o valor do pedido.
 * `identificador` vai como txid (ex.: "PEDIDO123"), para a loja achar no extrato.
 */
export function pixCopiaECola(p: { chave: string; nome: string; cidade: string; valorCentavos: number; identificador?: string }): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", p.chave);
  const txid = (p.identificador ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (p.valorCentavos > 0 ? campo("54", (p.valorCentavos / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", ascii(p.nome, 25) || "LOJA") +
    campo("60", ascii(p.cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}
