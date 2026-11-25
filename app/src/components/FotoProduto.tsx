/* eslint-disable @next/next/no-img-element -- a foto vem de uma rota própria, já pequena */
import { CATEGORIAS } from "@/lib/catalogo";

/** Endereço da foto do produto (ou null). A versão muda quando a foto muda, para o cache renovar. */
export function urlFoto(p: { id: string; foto: string | null }): string | null {
  if (!p.foto) return null;
  let h = 0;
  for (let i = 0; i < p.foto.length; i += 97) h = (h * 31 + p.foto.charCodeAt(i)) | 0;
  return `/f/produto/${p.id}?v=${(h >>> 0).toString(36)}${p.foto.length.toString(36)}`;
}

const ICONES: Record<string, string> = {
  Água: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  Bebidas: "M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z",
  "Gelo e polpas": "M12 2v20M4 6l16 12M20 6L4 18",
  "Bebidas alcoólicas": "M8 3h8l-1 9a3 3 0 0 1-6 0zM12 15v6M9 21h6",
  Acessórios: "M4 7h16v13H4zM9 7V4h6v3",
};

/** Foto quadrada do produto; sem foto, mostra um ícone da categoria. */
export default function FotoProduto({
  url,
  categoria,
  nome,
  tamanho = "md",
}: {
  url: string | null;
  categoria: string;
  nome: string;
  tamanho?: "sm" | "md" | "lg" | "cheia";
}) {
  const classe = { sm: "size-12", md: "size-20", lg: "size-24", cheia: "aspect-square w-full" }[tamanho];
  const grupo = CATEGORIAS[categoria as keyof typeof CATEGORIAS]?.grupo ?? "Bebidas";
  if (url) {
    return <img src={url} alt={nome} loading="lazy" decoding="async" className={`${classe} flex-none rounded-xl border border-borda bg-white object-cover`} />;
  }
  return (
    <span className={`${classe} flex flex-none items-center justify-center rounded-xl bg-verde-claro text-verde`} aria-hidden="true">
      <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONES[grupo] ?? ICONES.Bebidas} />
      </svg>
    </span>
  );
}
