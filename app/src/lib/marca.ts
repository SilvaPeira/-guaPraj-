import "server-only";
import { cookies } from "next/headers";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Cookie que diz "este visitante está no site/app da loja X". */
export const COOKIE_MARCA = "aguapraja_loja";

export type Marca = {
  lojaId: string;
  slug: string;
  nome: string;
  descricao: string | null;
  corPrimaria: string;
  corEscura: string;
  temLogo: boolean;
  status: "pendente" | "aprovada" | "suspensa";
};

const colunas = {
  lojaId: schema.lojas.id,
  slug: schema.lojas.slug,
  nome: schema.lojas.nome,
  descricao: schema.lojas.descricao,
  corPrimaria: schema.lojas.corPrimaria,
  corEscura: schema.lojas.corEscura,
  temLogo: sql<boolean>`(${schema.lojas.logo} is not null)`,
  status: schema.lojas.status,
};

/** Marca de uma loja pelo endereço (/l/<slug>). Não carrega a logo inteira. */
export async function marcaPorSlug(slug: string): Promise<Marca | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const db = await getDb();
  const [r] = await db.select(colunas).from(schema.lojas).where(eq(schema.lojas.slug, slug)).limit(1);
  if (!r || !r.slug) return null;
  return { ...r, slug: r.slug, temLogo: !!r.temLogo };
}

/** Marca ativa para este visitante (cookie), se a loja estiver aprovada. */
export async function marcaAtual(): Promise<Marca | null> {
  const c = await cookies();
  const slug = c.get(COOKIE_MARCA)?.value;
  if (!slug) return null;
  const m = await marcaPorSlug(slug);
  return m && m.status === "aprovada" ? m : null;
}

/** "Distribuidora JM Beer" → "distribuidora-jm-beer" */
export function slugDe(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export const SLUGS_RESERVADOS = new Set(["admin", "api", "loja", "lojas", "entrar", "app", "aguapraja", "suporte", "termos"]);

/** Gera um slug livre a partir do nome (adiciona -2, -3… se já existir). */
export async function slugLivre(nome: string, ignorarLojaId?: string): Promise<string> {
  const base = slugDe(nome) || "loja";
  const db = await getDb();
  for (let i = 1; i < 50; i++) {
    const s = i === 1 ? base : `${base.slice(0, 36)}-${i}`;
    if (s.length < 3 || SLUGS_RESERVADOS.has(s)) continue;
    const [existe] = await db
      .select({ id: schema.lojas.id })
      .from(schema.lojas)
      .where(ignorarLojaId ? and(eq(schema.lojas.slug, s), ne(schema.lojas.id, ignorarLojaId)) : eq(schema.lojas.slug, s))
      .limit(1);
    if (!existe) return s;
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36)}`;
}
