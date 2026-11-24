import { enviarLembretesDaVespera } from "@/lib/avisos";
import { agoraLocal, somarDias } from "@/lib/tempo";

// Roda 1x por dia (vercel.json → crons): lembra os clientes das entregas de amanhã
// e avisa as lojas dos pedidos que ainda não confirmaram.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const amanha = somarDias(agoraLocal().data, 1);
  const r = await enviarLembretesDaVespera(amanha);
  return Response.json({ ok: true, amanha, ...r });
}
