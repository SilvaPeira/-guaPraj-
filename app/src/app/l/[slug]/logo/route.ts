import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Serve a logo da loja (guardada como data URL PNG) como imagem normal, com cache.
export async function GET(_: Request, ctx: RouteContext<"/l/[slug]/logo">) {
  const { slug } = await ctx.params;
  const db = await getDb();
  const [l] = await db.select({ logo: schema.lojas.logo }).from(schema.lojas).where(eq(schema.lojas.slug, slug)).limit(1);
  const m = l?.logo?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return new Response("Sem logo", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
