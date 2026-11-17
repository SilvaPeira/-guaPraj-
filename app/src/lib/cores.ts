// Utilidades de cor para a marca da loja (sem dependências).

export const HEX = /^#[0-9a-fA-F]{6}$/;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Mistura `cor` com `com` (0 = só cor, 1 = só com). */
export function misturar(cor: string, com: string, quanto: number): string {
  const a = rgb(cor);
  const b = rgb(com);
  return hex(a.map((v, i) => v + (b[i] - v) * quanto));
}

/** Luminância relativa (WCAG). */
function luminancia(cor: string): number {
  const [r, g, b] = rgb(cor).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Escurece a cor até o texto branco ficar legível (contraste ≥ 4,5). */
export function garantirContrasteComBranco(cor: string): string {
  let c = cor;
  for (let i = 0; i < 12 && contraste(c, "#ffffff") < 4.5; i++) c = misturar(c, "#000000", 0.12);
  return c;
}

/** Variáveis CSS do tema da loja (sobrescrevem a paleta padrão do ÁguaPrajá). */
export function variaveisTema(corPrimaria: string, corEscura: string): Record<string, string> {
  const p = garantirContrasteComBranco(HEX.test(corPrimaria) ? corPrimaria : "#1b6b47");
  const e = garantirContrasteComBranco(HEX.test(corEscura) ? corEscura : "#0e3b2c");
  return {
    "--color-verde": p,
    "--color-verde-hover": misturar(p, "#000000", 0.15),
    "--color-verde-claro": misturar(p, "#ffffff", 0.88),
    "--color-verde-desligado": misturar(p, "#ffffff", 0.5),
    "--color-floresta": e,
    "--color-hero-texto": misturar(e, "#ffffff", 0.8),
  };
}

/** Paletas prontas para a loja escolher com um toque. */
export const PALETAS: { nome: string; primaria: string; escura: string }[] = [
  { nome: "Floresta (padrão)", primaria: "#1b6b47", escura: "#0e3b2c" },
  { nome: "Rio", primaria: "#1d6a8a", escura: "#134b63" },
  { nome: "Açaí", primaria: "#6b2a74", escura: "#4b1e52" },
  { nome: "Terra", primaria: "#b54e17", escura: "#6e2f0e" },
  { nome: "Cerveja", primaria: "#b7791f", escura: "#3d2a10" },
  { nome: "Vermelho", primaria: "#c0262d", escura: "#5c1215" },
  { nome: "Azul noite", primaria: "#2952a3", escura: "#16244a" },
  { nome: "Grafite", primaria: "#3f4a54", escura: "#1d2329" },
];

// ───────────── Tema completo da loja ─────────────

export const FONTES = {
  sora: { nome: "Sora (padrão)", variavel: "--font-sora" },
  poppins: { nome: "Poppins", variavel: "--font-poppins" },
  montserrat: { nome: "Montserrat", variavel: "--font-montserrat" },
  nunito: { nome: "Nunito (arredondada)", variavel: "--font-nunito" },
  oswald: { nome: "Oswald (estreita, forte)", variavel: "--font-oswald" },
  playfair: { nome: "Playfair (elegante)", variavel: "--font-playfair" },
} as const;
export type Fonte = keyof typeof FONTES;

export const CANTOS = {
  arredondado: { nome: "Arredondado", cartao: "20px", botao: "16px", campo: "12px", chip: "9999px" },
  suave: { nome: "Suave", cartao: "12px", botao: "10px", campo: "8px", chip: "10px" },
  reto: { nome: "Reto", cartao: "4px", botao: "4px", campo: "4px", chip: "4px" },
} as const;
export type Cantos = keyof typeof CANTOS;

export type OpcoesTema = {
  corPrimaria: string;
  corEscura: string;
  corDestaque?: string;
  corFundo?: string;
  fonte?: Fonte;
  cantos?: Cantos;
};

/** Garante fundo claro (o texto do app é escuro). */
export function garantirFundoClaro(cor: string): string {
  let c = HEX.test(cor) ? cor : "#f4f7f3";
  for (let i = 0; i < 12 && contraste(c, "#17261f") < 10; i++) c = misturar(c, "#ffffff", 0.25);
  return c;
}

/** Todas as variáveis CSS do tema da loja. */
export function temaDaLoja(o: OpcoesTema): Record<string, string> {
  const base = variaveisTema(o.corPrimaria, o.corEscura);
  const destaque = garantirContrasteComBranco(HEX.test(o.corDestaque ?? "") ? o.corDestaque! : "#4b1e52");
  const fundo = garantirFundoClaro(o.corFundo ?? "#f4f7f3");
  const cantos = CANTOS[o.cantos ?? "arredondado"] ?? CANTOS.arredondado;
  const fonte = FONTES[o.fonte ?? "sora"] ?? FONTES.sora;
  return {
    ...base,
    "--color-acai": destaque,
    "--color-acai-claro": misturar(destaque, "#ffffff", 0.9),
    "--color-rio": destaque,
    "--color-rio-esc": garantirContrasteComBranco(misturar(destaque, "#000000", 0.2)),
    "--color-rio-claro": misturar(destaque, "#ffffff", 0.88),
    "--color-rio-luz": misturar(destaque, "#ffffff", 0.72),
    "--color-fundo": fundo,
    "--font-titulo": `var(${fonte.variavel}), var(--font-inter), sans-serif`,
    "--raio-cartao": cantos.cartao,
    "--raio-botao": cantos.botao,
    "--raio-campo": cantos.campo,
    "--raio-chip": cantos.chip,
  };
}

export const FUNDOS = ["#f4f7f3", "#ffffff", "#f5f3ee", "#eef4f8", "#f6f1f7", "#fbf5ec", "#f2f2f2"];
