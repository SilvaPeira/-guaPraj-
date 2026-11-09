"use client";

import { useActionState, useEffect, useRef } from "react";
import { CATEGORIAS } from "@/lib/catalogo";
import { criarProduto, type EstadoForm } from "./actions";

export default function FormNovoProduto({ vendeAlcool }: { vendeAlcool: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(criarProduto, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={enviar} className="cartao pilha">
      <h2 className="titulo-secao">Adicionar produto</h2>
      <label className="campo">
        Nome
        <input className="entrada" name="nome" required maxLength={80} placeholder="Ex.: Refrigerante 2 L, Gelo 5 kg, Polpa de açaí 1 kg" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Marca
          <input className="entrada" name="marca" maxLength={60} placeholder="Ex.: Coca-Cola" />
        </label>
        <label className="campo">
          Categoria
          <select className="entrada" name="categoria" defaultValue="refrigerante">
            {Object.entries(CATEGORIAS)
              .filter(([k]) => vendeAlcool || k !== "alcoolica")
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v.nome}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Preço (R$)
          <input className="entrada" name="preco" inputMode="decimal" required placeholder="9,90" />
        </label>
        <label className="campo">
          Quantidade em estoque
          <input className="entrada" name="estoque" inputMode="numeric" placeholder="Ex.: 24" />
        </label>
      </div>
      <p className="text-xs text-tinta-suave">Deixe a quantidade vazia se não quiser controlar o estoque deste item.</p>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Adicionar"}
      </button>
    </form>
  );
}
