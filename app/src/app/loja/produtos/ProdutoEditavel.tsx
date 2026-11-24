"use client";

import { useTransition } from "react";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { atualizarProduto } from "./actions";

export default function ProdutoEditavel({ id, marca, precoCentavos, estoque }: { id: string; marca: string | null; precoCentavos: number; estoque: number | null }) {
  const ed = useEdicao();
  const [salvando, iniciar] = useTransition();
  return (
    <form
      key={ed.chave}
      action={(fd) =>
        iniciar(async () => {
          await atualizarProduto(fd);
          ed.concluir();
        })
      }
      className="pilha"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="acao" value="salvar" />
      <fieldset disabled={!ed.editando} className="grid grid-cols-2 gap-2">
        <label className="campo col-span-2">
          Marca
          <input className="entrada min-h-11" name="marca" maxLength={60} defaultValue={marca ?? ""} placeholder="—" />
        </label>
        <label className="campo">
          Preço (R$)
          <input className="entrada min-h-11" name="preco" inputMode="decimal" defaultValue={(precoCentavos / 100).toFixed(2).replace(".", ",")} />
        </label>
        <label className="campo">
          Estoque
          <input className="entrada min-h-11" name="estoque" inputMode="numeric" defaultValue={estoque ?? ""} placeholder="não controla" />
        </label>
      </fieldset>
      <BotoesEdicao ed={ed} salvando={salvando} pequeno />
    </form>
  );
}
