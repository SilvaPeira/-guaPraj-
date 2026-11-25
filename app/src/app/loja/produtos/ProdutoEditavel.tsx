"use client";

import { useState, useTransition } from "react";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { atualizarProduto } from "./actions";
import CampoRetornavel from "./CampoRetornavel";
import CampoFoto from "./CampoFoto";

type Props = {
  id: string;
  nome: string;
  marca: string | null;
  precoCentavos: number;
  estoque: number | null;
  precoLiquidoCentavos: number | null;
  podeRetornavel: boolean;
  fotoUrl: string | null;
};

export default function ProdutoEditavel({ id, nome, marca, precoCentavos, estoque, precoLiquidoCentavos, podeRetornavel, fotoUrl }: Props) {
  const ed = useEdicao();
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  function excluir() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("acao", "excluir");
    iniciar(async () => {
      const r = await atualizarProduto(fd);
      if (r.erro) setErro(r.erro);
      setConfirmarExclusao(false);
    });
  }

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
      {ed.editando && (
        <fieldset className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <CampoFoto atualUrl={fotoUrl} />
          </div>
          <label className="campo col-span-2">
            Nome
            <input className="entrada min-h-11" name="nome" required maxLength={80} defaultValue={nome} />
          </label>
        </fieldset>
      )}
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
      {!ed.editando && <input type="hidden" name="nome" value={nome} />}
      {erro && (
        <p role="alert" className="aviso-erro text-sm">
          {erro}
        </p>
      )}
      <BotoesEdicao
        ed={{
          ...ed,
          cancelar: () => {
            setErro(null);
            setConfirmarExclusao(false);
            ed.cancelar();
          },
        }}
        salvando={salvando}
        pequeno
      />
      {ed.editando &&
        (confirmarExclusao ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-terra-claro p-3 text-sm">
            <span className="flex-1">
              Excluir <b>{nome}</b> do catálogo? Pedidos antigos continuam com o registro.
            </span>
            <button type="button" className="botao-peq" onClick={excluir} disabled={salvando}>
              {salvando ? "Excluindo…" : "Sim, excluir"}
            </button>
            <button type="button" className="botao-peq-sec" onClick={() => setConfirmarExclusao(false)}>
              Não
            </button>
          </div>
        ) : (
          <button type="button" className="self-start text-sm font-semibold text-terra-esc underline" onClick={() => setConfirmarExclusao(true)}>
            Excluir produto
          </button>
        ))}
    </form>
  );
}
