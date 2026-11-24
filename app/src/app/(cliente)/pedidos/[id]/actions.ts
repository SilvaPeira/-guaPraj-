"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarCobranca, ErroPagamento } from "@/lib/mercadopago";
import { urlBase } from "@/lib/url";
import { exigirCliente } from "@/lib/cliente";
import { avaliarPedido } from "@/lib/avaliacoes";
import { ErroPedido } from "@/lib/pedidos";

export type EstadoAvaliacao = { erro?: string; ok?: string };

export async function avaliar(_: EstadoAvaliacao, form: FormData): Promise<EstadoAvaliacao> {
  const { usuario } = await exigirCliente();
  try {
    await avaliarPedido(usuario.id, String(form.get("pedidoId")), Number(form.get("nota")), String(form.get("comentario") ?? ""));
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
  revalidatePath("/inicio");
  return { ok: "Obrigado!" };
}

/** Gera a cobrança (Pix/cartão) do pedido e manda o cliente para o pagamento. */
export async function pagarAgora(form: FormData) {
  const { usuario } = await exigirCliente();
  const id = String(form.get("pedidoId") ?? "");
  let link: string;
  try {
    link = await criarCobranca(id, usuario.id, await urlBase());
  } catch (e) {
    if (!(e instanceof ErroPagamento)) throw e;
    redirect(`/pedidos/${id}?pagamento=falhou`);
  }
  redirect(link);
}
