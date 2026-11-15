import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_MARCA, marcaPorSlug } from "@/lib/marca";
import { usuarioAtual } from "@/lib/sessao";

// Entrada do site/app da loja: liga o tema da loja (cookie) e leva o cliente
// para o lugar certo. É o start_url do app instalado.
export async function GET(req: Request, ctx: RouteContext<"/l/[slug]/abrir">) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const m = await marcaPorSlug(slug);
  if (!m || m.status !== "aprovada") return NextResponse.redirect(new URL("/", url));

  const c = await cookies();
  c.set(COOKIE_MARCA, m.slug, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 365 * 24 * 3600 });

  const para = url.searchParams.get("para");
  const u = await usuarioAtual();
  let destino: string;
  if (para === "entrar") destino = u ? "/inicio" : "/entrar";
  else if (para === "pedir") destino = u ? `/pedir/${m.lojaId}` : "/entrar";
  else if (para === "planos") destino = u ? `/lojas/${m.lojaId}` : "/entrar";
  else destino = u?.papel === "cliente" ? "/inicio" : `/l/${m.slug}`;
  return NextResponse.redirect(new URL(destino, url));
}
