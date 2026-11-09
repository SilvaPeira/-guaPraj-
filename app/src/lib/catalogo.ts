export const CATEGORIAS = {
  agua_galao: { nome: "Água em galão 20 L", grupo: "Água" },
  agua: { nome: "Água (garrafa, fardo, com gás)", grupo: "Água" },
  refrigerante: { nome: "Refrigerante", grupo: "Bebidas" },
  suco: { nome: "Suco, isotônico, energético", grupo: "Bebidas" },
  gelo: { nome: "Gelo", grupo: "Gelo e polpas" },
  polpa: { nome: "Polpa de fruta / açaí", grupo: "Gelo e polpas" },
  alcoolica: { nome: "Bebida alcoólica (18+)", grupo: "Bebidas alcoólicas" },
  acessorio: { nome: "Acessório (copo, suporte, bomba)", grupo: "Acessórios" },
  casco: { nome: "Casco (vasilhame)", grupo: "Acessórios" },
} as const;

export type Categoria = keyof typeof CATEGORIAS;

/** Ordem em que os grupos aparecem para o cliente. */
export const ORDEM_GRUPOS = ["Água", "Bebidas", "Gelo e polpas", "Bebidas alcoólicas", "Acessórios"];
