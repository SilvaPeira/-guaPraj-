import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { garantirContrasteComBranco } from "@/lib/cores";

// Ícone do app instalável da loja (192, 512, 180 p/ iPhone; "-mascara" = área segura p/ Android).
const TAMANHOS = new Set([180, 192, 512]);

export async function GET(_: Request, ctx: RouteContext<"/l/[slug]/icone/[tamanho]">) {
  const { slug, tamanho: t } = await ctx.params;
  const mascara = t.endsWith("-mascara");
  const tamanho = Number(t.replace("-mascara", ""));
  if (!TAMANHOS.has(tamanho)) return new Response("Tamanho inválido", { status: 400 });

  const db = await getDb();
  const [l] = await db
    .select({ nome: schema.lojas.nome, logo: schema.lojas.logo, cor: schema.lojas.corEscura })
    .from(schema.lojas)
    .where(eq(schema.lojas.slug, slug))
    .limit(1);
  if (!l) return new Response("Loja não encontrada", { status: 404 });

  const fundo = garantirContrasteComBranco(l.cor);
  // Com logo: logo sobre fundo branco. Sem logo: iniciais sobre a cor da loja.
  const iniciais = l.nome
    .replace(/distribuidora|dep[oó]sito|de |da |do /gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const margem = mascara ? 0.2 : 0.1; // ícones "maskable" precisam de área segura maior

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: l.logo ? "#ffffff" : fundo,
          borderRadius: mascara ? 0 : tamanho * 0.18,
        }}
      >
        {l.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.logo} alt="" width={tamanho * (1 - margem * 2)} height={tamanho * (1 - margem * 2)} style={{ objectFit: "contain" }} />
        ) : (
          <span style={{ color: "#ffffff", fontSize: tamanho * 0.42, fontWeight: 800, letterSpacing: -2 }}>{iniciais || "A"}</span>
        )}
      </div>
    ),
    {
      width: tamanho,
      height: tamanho,
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    },
  );
}
