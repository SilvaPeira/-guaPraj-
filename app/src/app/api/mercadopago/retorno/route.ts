import { redirect } from "next/navigation";
import { exigirLoja } from "@/lib/loja";
import { concluirConexao, lerEstadoOAuth, modoPagamento } from "@/lib/mercadopago";
import { urlBase } from "@/lib/url";

// Volta do Mercado Pago depois que a distribuidora autoriza o ÁguaPrajá.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const { loja } = await exigirLoja();
  const code = u.searchParams.get("code");
  const lojaDoEstado = lerEstadoOAuth(u.searchParams.get("state") ?? "");
  if (modoPagamento() !== "real" || !code || lojaDoEstado !== loja.id) {
    redirect("/loja/pagamentos?erro=conexao");
  }
  let ok = true;
  try {
    await concluirConexao(loja.id, code, await urlBase());
  } catch (e) {
    console.error("[mercadopago] falha ao conectar loja", loja.id, e);
    ok = false;
  }
  redirect(ok ? "/loja/pagamentos?ok=1" : "/loja/pagamentos?erro=conexao");
}
