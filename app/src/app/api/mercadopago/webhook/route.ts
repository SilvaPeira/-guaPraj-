import { assinaturaValida, modoPagamento, processarPagamento } from "@/lib/mercadopago";
import { avisarLojaPagamento } from "@/lib/avisos";

// Aviso do Mercado Pago (notification_url de cada cobrança, com ?loja=<id>).
// O conteúdo do aviso não é usado como verdade: o pagamento é consultado na API.
export async function POST(req: Request) {
  if (modoPagamento() !== "real") return new Response("ok");
  const u = new URL(req.url);
  const lojaId = u.searchParams.get("loja") ?? "";
  let corpo: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    corpo = await req.json();
  } catch {
    // alguns avisos vêm só pela query string
  }
  const tipo = corpo.type ?? u.searchParams.get("type") ?? u.searchParams.get("topic");
  const dataId = String(corpo.data?.id ?? u.searchParams.get("data.id") ?? u.searchParams.get("id") ?? "");
  if (tipo !== "payment" || !dataId || !/^[0-9a-f-]{36}$/.test(lojaId)) return new Response("ignorado");
  if (!assinaturaValida(req.headers.get("x-signature"), req.headers.get("x-request-id"), u.searchParams.get("data.id") ?? dataId)) {
    return new Response("assinatura inválida", { status: 401 });
  }
  try {
    const r = await processarPagamento(lojaId, dataId);
    if (r?.agoraPago) await avisarLojaPagamento(r.pedidoId);
  } catch (e) {
    console.error("[mercadopago] webhook", lojaId, dataId, e);
    return new Response("erro", { status: 500 }); // o Mercado Pago tenta de novo
  }
  return new Response("ok");
}
