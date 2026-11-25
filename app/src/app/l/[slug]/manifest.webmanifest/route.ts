import { marcaPorSlug } from "@/lib/marca";
import { garantirContrasteComBranco, garantirFundoClaro } from "@/lib/cores";

// Manifesto do app instalável DA LOJA: no celular aparece o nome e o ícone dela.
export async function GET(_: Request, ctx: RouteContext<"/l/[slug]/manifest.webmanifest">) {
  const { slug } = await ctx.params;
  const m = await marcaPorSlug(slug);
  if (!m || !m.appProprio) return new Response("Loja não encontrada", { status: 404 });
  const nomeCurto = (m.personalizacao.nomeCurto || m.nome.replace(/^(distribuidora|dep[oó]sito)\s+/i, "")).slice(0, 20);
  const manifesto = {
    id: `/l/${m.slug}`,
    name: m.nome,
    short_name: nomeCurto,
    description: m.descricao ?? `Peça água e bebidas da ${m.nome}.`,
    lang: "pt-BR",
    start_url: `/l/${m.slug}/abrir?origem=app`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: garantirFundoClaro(m.personalizacao.corFundo ?? "#f4f7f3"),
    theme_color: garantirContrasteComBranco(m.corEscura),
    icons: [
      { src: `/l/${m.slug}/icone/192`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/l/${m.slug}/icone/512`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/l/${m.slug}/icone/512-mascara`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifesto, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" },
  });
}
