import { exigirLoja } from "@/lib/loja";
import { recursosDaLoja } from "@/lib/planos-app";
import { linkDoApp, qrPng } from "@/lib/qr";

// QR code do app da loja em PNG (1024 px), para mandar para a gráfica ou usar em panfleto.
export async function GET(req: Request) {
  const { loja } = await exigirLoja();
  if (!loja.slug || !(await recursosDaLoja(loja.id)).appProprio) return new Response("O QR code vem com o app próprio (plano Completo).", { status: 403 });
  const png = await qrPng(linkDoApp(loja.slug, new URL(req.url).origin), 1024, loja.corEscura);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="qrcode-${loja.slug}.png"`, "Cache-Control": "private, max-age=300" },
  });
}
