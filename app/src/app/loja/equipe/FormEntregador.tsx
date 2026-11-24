"use client";

import { useActionState } from "react";
import { adicionarEntregador, type EstadoOperacao } from "../operacao-actions";

export default function FormEntregador() {
  const [estado, enviar, enviando] = useActionState<EstadoOperacao, FormData>(adicionarEntregador, {});
  return (
    <form action={enviar} key={estado.ok ?? "novo"} className="cartao pilha">
      <h2 className="titulo-secao">Cadastrar entregador</h2>
      <label className="campo">
        Nome
        <input className="entrada" name="nome" required maxLength={60} />
      </label>
      <label className="campo">
        Celular (WhatsApp)
        <input className="entrada" name="telefone" inputMode="tel" required placeholder="(94) 9 9999-9999" />
      </label>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        Cadastrar
      </button>
    </form>
  );
}
