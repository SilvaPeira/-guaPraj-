"use server";

import { redirect } from "next/navigation";
import { exigirUsuario, encerrarSessao } from "@/lib/sessao";
import { ErroConta, excluirConta } from "@/lib/conta";

export type EstadoExclusao = { erro?: string };

/** Cliente exclui a própria conta (LGPD). Pede a senha e a confirmação. */
export async function excluirMinhaConta(_: EstadoExclusao, form: FormData): Promise<EstadoExclusao> {
  const u = await exigirUsuario(["cliente"]);
  if (form.get("confirmo") !== "on") return { erro: "Marque que entendeu que não dá para desfazer." };
  try {
    await excluirConta(u.id, String(form.get("senha") ?? ""));
  } catch (e) {
    if (e instanceof ErroConta) return { erro: e.message };
    throw e;
  }
  await encerrarSessao();
  redirect("/conta-excluida");
}
