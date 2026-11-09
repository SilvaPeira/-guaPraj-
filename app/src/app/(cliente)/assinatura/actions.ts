"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirCliente } from "@/lib/cliente";
import { agendarTrocaPlano, alterarAgenda, alternarPulo, cancelarAssinatura, criarAssinatura, type DadosAgenda } from "@/lib/assinaturas";
import { cancelarPedidoCliente, ErroPedido } from "@/lib/pedidos";
import type { EstadoAgenda } from "@/components/FormAgenda";

function lerAgenda(form: FormData): { agenda: DadosAgenda; modo: "entrega" | "retirada" } {
  const tipo = String(form.get("tipoHorario") ?? "");
  return {
    modo: form.get("modo") === "retirada" ? "retirada" : "entrega",
    agenda: {
      frequencia: String(form.get("frequencia") ?? "") as DadosAgenda["frequencia"],
      dias: form.getAll("dias").map(Number),
      qtdPorEntrega: Number(form.get("qtdPorEntrega")),
      tipoHorario: tipo as DadosAgenda["tipoHorario"],
      inicio: String(form.get("inicio") ?? ""),
      fim: String(form.get("fim") ?? ""),
    },
  };
}

export async function assinar(_: EstadoAgenda, form: FormData): Promise<EstadoAgenda> {
  const { usuario, endereco } = await exigirCliente();
  const { agenda, modo } = lerAgenda(form);
  try {
    await criarAssinatura({
      clienteId: usuario.id,
      planoId: String(form.get("planoId") ?? ""),
      endereco,
      modo,
      agenda,
      cascosComprar: Number(form.get("cascosComprar")) || 0,
      aceite: form.get("aceite") === "on",
    });
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
  redirect("/assinatura?nova=1");
}

export async function salvarAgenda(_: EstadoAgenda, form: FormData): Promise<EstadoAgenda> {
  const { usuario } = await exigirCliente();
  const { agenda, modo } = lerAgenda(form);
  try {
    await alterarAgenda(usuario.id, String(form.get("assinaturaId") ?? ""), modo, agenda, form.get("aceite") === "on");
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
  redirect("/assinatura?alterada=1");
}

export type EstadoSimples = { erro?: string; ok?: string };

export async function pular(form: FormData) {
  const { usuario } = await exigirCliente();
  try {
    await alternarPulo(usuario.id, String(form.get("assinaturaId")), String(form.get("data")));
  } catch (e) {
    if (!(e instanceof ErroPedido)) throw e;
  }
  revalidatePath("/assinatura");
  revalidatePath("/inicio");
}

export async function trocarPlano(_: EstadoSimples, form: FormData): Promise<EstadoSimples> {
  const { usuario } = await exigirCliente();
  try {
    await agendarTrocaPlano(usuario.id, String(form.get("assinaturaId")), String(form.get("planoId") ?? "") || null);
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
  revalidatePath("/assinatura");
  return { ok: "Troca de plano agendada para o próximo mês." };
}

export async function cancelar(_: EstadoSimples, form: FormData): Promise<EstadoSimples> {
  const { usuario } = await exigirCliente();
  if (form.get("confirmo") !== "on") return { erro: "Marque a confirmação para cancelar." };
  try {
    await cancelarAssinatura(usuario.id, String(form.get("assinaturaId")));
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
  revalidatePath("/assinatura");
  revalidatePath("/inicio");
  return { ok: "Plano cancelado." };
}

export async function cancelarPedido(form: FormData) {
  const { usuario } = await exigirCliente();
  try {
    await cancelarPedidoCliente(usuario.id, String(form.get("pedidoId")));
  } catch (e) {
    if (!(e instanceof ErroPedido)) throw e;
  }
  revalidatePath("/pedidos");
  revalidatePath("/inicio");
}
