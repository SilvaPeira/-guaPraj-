"use client";

import { useActionState, useState } from "react";
import { novaSenhaPorLink } from "../actions";
import { formatarTelefone } from "@/lib/telefone";

export default function FormNovaSenha({ telefone, token }: { telefone: string; token: string }) {
  const [e, enviar, enviando] = useActionState<{ erro?: string }, FormData>(novaSenhaPorLink, {});
  const [ver, setVer] = useState(false);
  return (
    <form action={enviar} className="pilha">
      <input type="hidden" name="telefone" value={telefone} />
      <input type="hidden" name="token" value={token} />
      <p>
        Conta: <b>{formatarTelefone(telefone)}</b>
      </p>
      <label className="campo">
        Senha nova (mínimo 6)
        <input className="entrada" name="senha" type={ver ? "text" : "password"} autoComplete="new-password" minLength={6} required autoFocus />
      </label>
      <label className="campo">
        Repita a senha nova
        <input className="entrada" name="confirmacao" type={ver ? "text" : "password"} autoComplete="new-password" minLength={6} required />
      </label>
      <label className="flex items-center gap-2 text-sm text-tinta-suave">
        <input type="checkbox" checked={ver} onChange={(x) => setVer(x.target.checked)} className="h-4 w-4 accent-verde" />
        Mostrar senha
      </label>
      {e.erro && <p role="alert" className="aviso-erro">{e.erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar senha e entrar"}
      </button>
    </form>
  );
}
