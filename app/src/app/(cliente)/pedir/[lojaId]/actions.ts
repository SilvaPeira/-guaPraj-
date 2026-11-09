"use server";

import { redirect } from "next/navigation";
import { exigirCliente } from "@/lib/cliente";
import { criarPedido, ErroPedido } from "@/lib/pedidos";

export type EstadoPedido = { erro?: string };

const inteiro = (v: FormDataEntryValue | null, max = 99) => {
  const n = Number(v);
  return Number.isInteger(n) ? Math.min(max, Math.max(0, n)) : 0;
};

export async function fazerPedido(_: EstadoPedido, form: FormData): Promise<EstadoPedido> {
  const { usuario, endereco } = await exigirCliente();
  const lojaId = String(form.get("lojaId") ?? "");
  const tipo = String(form.get("tipoHorario") ?? "");
  if (!["imediato", "exato", "janela", "periodo"].includes(tipo)) return { erro: "Escolha o horário." };
  const data = String(form.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Escolha o dia." };

  const itens: { produtoId: string; qtd: number }[] = [];
  for (const [k, v] of form.entries()) {
    if (k.startsWith("item:")) itens.push({ produtoId: k.slice(5), qtd: inteiro(v) });
  }
  const galoes = inteiro(form.get("galoes"));
  const cascosComprados = form.get("casco") === "comprar" ? inteiro(form.get("cascosComprar")) : 0;

  let id: string;
  try {
    const p = await criarPedido({
      clienteId: usuario.id,
      lojaId,
      enderecoId: endereco.id,
      ponto: endereco,
      modo: form.get("modo") === "retirada" ? "retirada" : "entrega",
      tipoHorario: tipo as "imediato" | "exato" | "janela" | "periodo",
      data,
      inicio: String(form.get("inicio") ?? ""),
      fim: String(form.get("fim") ?? ""),
      galoes,
      cascosComprados,
      itens,
      formaPagamento: "na_entrega",
      declarou18: form.get("maior18") === "on",
      assinaturaId: String(form.get("assinaturaId") ?? "") || null,
    });
    id = p.id;
  } catch (e) {
    if (e instanceof ErroPedido) return { erro: e.message };
    throw e;
  }
  redirect(`/pedidos/${id}?novo=1`);
}
