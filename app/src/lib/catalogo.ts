/** Tipos de produto (regras do sistema). As categorias que o cliente vê ficam em Admin → Categorias. */
export const CATEGORIAS = {
  agua_galao: { nome: "Água em galão 20 L" },
  agua: { nome: "Água (garrafa, fardo, com gás)" },
  refrigerante: { nome: "Refrigerante" },
  suco: { nome: "Suco, isotônico, energético" },
  gelo: { nome: "Gelo" },
  polpa: { nome: "Polpa de fruta / açaí" },
  alcoolica: { nome: "Bebida alcoólica (18+)" },
  acessorio: { nome: "Acessório (copo, suporte, bomba)" },
  casco: { nome: "Casco (vasilhame)" },
} as const;

export type Categoria = keyof typeof CATEGORIAS;

/** Pode ser vendido agora? (ligado e, se controla estoque, com quantidade) */
export function podeVender(p: { disponivel: boolean; estoque: number | null; excluidoEm?: Date | null }): boolean {
  return !p.excluidoEm && p.disponivel && (p.estoque === null || p.estoque > 0);
}

/** Abaixo disso a loja recebe o alerta de estoque baixo. */
/** Categorias que podem ser vendidas como retornável (cliente traz o casco vazio). */
export const PODE_SER_RETORNAVEL = ["refrigerante", "suco", "alcoolica", "agua"] as const;
export const podeSerRetornavel = (categoria: string) => (PODE_SER_RETORNAVEL as readonly string[]).includes(categoria);

export const ESTOQUE_BAIXO = 5;

