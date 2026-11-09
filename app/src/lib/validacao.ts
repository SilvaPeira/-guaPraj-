import { z } from "zod";

export const CIDADES = ["Canaã dos Carajás", "Parauapebas", "Marabá"] as const;

const texto = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));
const coord = (min: number, max: number) =>
  z.coerce.number({ message: "Marque o ponto no mapa." }).refine((v) => Number.isFinite(v) && v >= min && v <= max, "Marque o ponto no mapa.");

export const esquemaEndereco = z.object({
  logradouro: texto(3, 120, "Informe a rua."),
  numero: opcional(20),
  complemento: opcional(80),
  bairro: texto(2, 80, "Informe o bairro."),
  cidade: z.enum(CIDADES),
  referencia: opcional(160),
  lat: coord(-90, 90),
  lng: coord(-180, 180),
});

/** Converte reais digitados ("15", "15,50", "R$ 2,00") em centavos. */
export function reaisParaCentavos(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) : null;
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Primeiro erro de um parse do zod, para mostrar ao usuário. */
export function primeiroErro(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Confira os dados.";
}
