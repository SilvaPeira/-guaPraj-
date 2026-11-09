"use client";

import { useActionState } from "react";
import { criarPlano, type EstadoForm } from "./actions";

export default function FormNovoPlano() {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(criarPlano, {});
  return (
    <form action={enviar} className="cartao pilha">
      <h2 className="titulo-secao">Novo plano</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Galões por mês
          <input className="entrada" name="galoes" inputMode="numeric" required placeholder="Ex.: 40" />
        </label>
        <label className="campo">
          Preço por mês (R$)
          <input className="entrada" name="preco" inputMode="decimal" required placeholder="540,00" />
        </label>
      </div>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        Criar plano
      </button>
    </form>
  );
}
