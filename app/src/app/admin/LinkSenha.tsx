"use client";

import { useActionState } from "react";
import { gerarLinkSenha, type EstadoLinkSenha } from "./actions";
import { linkWhatsApp } from "@/lib/telefone";

export default function LinkSenha() {
  const [e, enviar, enviando] = useActionState<EstadoLinkSenha, FormData>(gerarLinkSenha, {});
  return (
    <details className="cartao">
      <summary className="cursor-pointer font-semibold">Alguém esqueceu a senha?</summary>
      <form action={enviar} className="pilha mt-3">
        <label className="campo">
          Celular da pessoa
          <input className="entrada" name="telefone" inputMode="tel" placeholder="(94) 9 9999-9999" required />
        </label>
        {e.erro && <p role="alert" className="aviso-erro">{e.erro}</p>}
        <button className="botao-sec" disabled={enviando}>
          {enviando ? "Gerando…" : "Gerar link para nova senha"}
        </button>
        {e.link && e.telefone && (
          <div className="aviso-info pilha text-sm">
            <p>Link de uso único, vale 24 horas. Confirme que é a própria pessoa antes de enviar.</p>
            <input className="entrada text-xs" readOnly value={e.link} onFocus={(x) => x.target.select()} />
            <a className="botao" href={linkWhatsApp(e.telefone, `Olá! Para criar uma nova senha no ÁguaPrajá, abra este link (vale 24 h): ${e.link}`)} target="_blank" rel="noopener noreferrer">
              Enviar pelo WhatsApp
            </a>
          </div>
        )}
      </form>
    </details>
  );
}
