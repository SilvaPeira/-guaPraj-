"use client";

import { useActionState } from "react";
import { enviarSemLimpar } from "@/lib/formulario";
import { excluirMinhaConta, type EstadoExclusao } from "./conta-actions";

/** "Excluir minha conta" (LGPD): fica fechado num <details> para ninguém tocar sem querer. */
export default function ExcluirConta() {
  const [estado, enviar, enviando] = useActionState<EstadoExclusao, FormData>(excluirMinhaConta, {});
  return (
    <details className="cartao">
      <summary className="cursor-pointer list-none font-bold text-terra-esc">Excluir minha conta</summary>
      <form onSubmit={enviarSemLimpar(enviar)} className="pilha mt-3">
        <p className="text-sm">
          Apagamos seu nome, celular, senha, endereço, avisos e a localização. Os pedidos antigos continuam com a distribuidora (para nota fiscal), mas sem os seus
          dados. Antes, cancele o plano mensal e espere os pedidos em andamento.
        </p>
        <label className="campo">
          Sua senha
          <input className="entrada" name="senha" type="password" autoComplete="current-password" required />
        </label>
        <label className="escolha items-start">
          <input type="checkbox" name="confirmo" className="mt-1 h-5 w-5 shrink-0 accent-verde" />
          <span className="text-sm">Entendo que a exclusão não pode ser desfeita.</span>
        </label>
        {estado.erro && (
          <p role="alert" className="aviso-erro text-sm">
            {estado.erro}
          </p>
        )}
        <button className="botao-peq-perigo self-start" disabled={enviando}>
          {enviando ? "Excluindo…" : "Excluir minha conta definitivamente"}
        </button>
      </form>
    </details>
  );
}
