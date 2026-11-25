import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Serve a foto do produto (guardada como data URL JPEG) como imagem normal, com cache.
// O endereço leva ?v=<versão>, então dá para guardar em cache por bastante tempo.
export async function GET(_: Request, ctx: RouteContext<"/f/produto/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Inválido", { status: 404 });
  const db = await getDb();
  const [p] = await db.select({ foto: schema.produtos.foto }).from(schema.produtos).where(eq(schema.produtos.id, id)).limit(1);
  const m = p?.foto?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return new Response("Sem foto", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
