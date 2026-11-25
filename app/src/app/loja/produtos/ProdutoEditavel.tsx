"use client";

import { useState, useTransition } from "react";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { atualizarProduto } from "./actions";
import CampoRetornavel from "./CampoRetornavel";

type Props = {
  id: string;
  marca: string | null;
  precoCentavos: number;
  estoque: number | null;
  precoLiquidoCentavos: number | null;
  podeRetornavel: boolean;
};

export default function ProdutoEditavel({ id, marca, precoCentavos, estoque, precoLiquidoCentavos, podeRetornavel }: Props) {
  const ed = useEdicao();
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <form
      key={ed.chave}
      action={(fd) =>
        iniciar(async () => {
          const r = await atualizarProduto(fd);
          if (r.erro) setErro(r.erro);
          else {
            setErro(null);
            ed.concluir();
          }
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
          Preço normal (R$)
          <input className="entrada min-h-11" name="preco" inputMode="decimal" defaultValue={(precoCentavos / 100).toFixed(2).replace(".", ",")} />
        </label>
        <label className="campo">
          Estoque
          <input className="entrada min-h-11" name="estoque" inputMode="numeric" defaultValue={estoque ?? ""} placeholder="não controla" />
        </label>
        {podeRetornavel && (
          <div className="col-span-2">
            <CampoRetornavel inicialCentavos={precoLiquidoCentavos} />
          </div>
        )}
      </fieldset>
      {erro && ed.editando && (
        <p role="alert" className="aviso-erro text-sm">
          {erro}
        </p>
      )}
      <BotoesEdicao
        ed={{
          ...ed,
          cancelar: () => {
            setErro(null);
            ed.cancelar();
          },
        }}
        salvando={salvando}
        pequeno
      />
    </form>
  );
}
