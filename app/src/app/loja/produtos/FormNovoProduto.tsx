"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CATEGORIAS, podeSerRetornavel } from "@/lib/catalogo";
import { criarProduto, type EstadoForm } from "./actions";
import CampoRetornavel from "./CampoRetornavel";
import CampoFoto from "./CampoFoto";
import { enviarSemLimpar } from "@/lib/formulario";

export default function FormNovoProduto({ vendeAlcool }: { vendeAlcool: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(criarProduto, {});
  const [categoria, setCategoria] = useState("refrigerante");
  const [versao, setVersao] = useState(0); // reinicia o campo "retornável" depois de salvar
  const ref = useRef<HTMLFormElement>(null);
  // Depois de salvar: volta a categoria e o "retornável" ao início (ajuste durante o render).
  const [ultimo, setUltimo] = useState(estado);
  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado.ok) {
      setCategoria("refrigerante");
      setVersao((v) => v + 1);
    }
  }
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} onSubmit={enviarSemLimpar(enviar)} className="cartao pilha">
      <h2 className="titulo-secao">Adicionar produto</h2>
      <CampoFoto key={`foto-${versao}`} />
      <label className="campo">
        Nome
        <input className="entrada" name="nome" required maxLength={80} placeholder="Ex.: Refrigerante 2 L, Cerveja 600 ml, Gelo 5 kg" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Marca
          <input className="entrada" name="marca" maxLength={60} placeholder="Ex.: Coca-Cola" />
        </label>
        <label className="campo">
          Categoria
          <select className="entrada" name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
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
          Preço normal (R$)
          <input className="entrada" name="preco" inputMode="decimal" required placeholder="9,90" />
        </label>
        <label className="campo">
          Quantidade em estoque
          <input className="entrada" name="estoque" inputMode="numeric" placeholder="Ex.: 24" />
        </label>
      </div>
      {podeSerRetornavel(categoria) && <CampoRetornavel key={versao} />}
      <p className="text-xs text-tinta-suave">Deixe a quantidade vazia se não quiser controlar o estoque deste item.</p>
      {estado.erro && (
        <p role="alert" className="aviso-erro">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="aviso-ok">
          {estado.ok}
        </p>
      )}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Adicionar"}
      </button>
    </form>
  );
}
