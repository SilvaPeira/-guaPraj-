"use server";

import { revalidatePath } from "next/cache";
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
