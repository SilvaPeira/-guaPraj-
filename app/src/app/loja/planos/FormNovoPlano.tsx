"use client";

import { useActionState, useState } from "react";
import { criarPlano, type EstadoForm } from "./actions";

export default function FormNovoPlano({ precoAvulsoCentavos }: { precoAvulsoCentavos: number }) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(criarPlano, {});
  return (
    <form action={enviar} className="cartao pilha">
      <h2 className="titulo-secao">Criar plano</h2>
      <p className="text-sm text-tinta-suave">Você escolhe a quantidade e o preço. Ex.: 3 galões por R$ 30,00 ou 20 galões por R$ 270,00.</p>
      {/* A key muda a cada plano criado, limpando os campos. */}
      <Campos key={estado.ok ?? "novo"} precoAvulsoCentavos={precoAvulsoCentavos} />
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        Criar plano
      </button>
    </form>
  );
}

function Campos({ precoAvulsoCentavos }: { precoAvulsoCentavos: number }) {
  const [galoes, setGaloes] = useState("");
  const [preco, setPreco] = useState("");
  const g = Number(galoes);
  const p = Number(preco.replace(/\./g, "").replace(",", "."));
  const previa =
    g > 0 && p > 0
      ? { porGalao: p / g, desconto: precoAvulsoCentavos ? Math.round((1 - (p * 100) / (g * precoAvulsoCentavos)) * 100) : null }
      : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Galões por mês
          <input className="entrada" name="galoes" inputMode="numeric" required placeholder="Ex.: 3" value={galoes} onChange={(e) => setGaloes(e.target.value)} />
        </label>
        <label className="campo">
          Preço por mês (R$)
          <input className="entrada" name="preco" inputMode="decimal" required placeholder="Ex.: 30,00" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </label>
      </div>
      {previa && (
        <p className="text-sm" aria-live="polite">
          Sai a <b>{previa.porGalao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b> o galão
          {previa.desconto !== null && (previa.desconto > 0 ? ` · ${previa.desconto}% mais barato que o avulso` : " · sem desconto sobre o avulso")}
        </p>
      )}
    </>
  );
}
