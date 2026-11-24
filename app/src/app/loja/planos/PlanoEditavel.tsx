"use client";

import { useTransition } from "react";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { salvarPlano } from "./actions";

type Props = {
  id: string;
  galoesMes: number;
  precoCentavos: number;
  ativo: boolean;
  assinantes: number;
};

export default function PlanoEditavel(p: Props) {
  const ed = useEdicao();
  const [salvando, iniciar] = useTransition();
  const reais = (p.precoCentavos / 100).toFixed(2).replace(".", ",");

  return (
    <>
      <form
        key={ed.chave}
        action={(fd) =>
          iniciar(async () => {
            await salvarPlano(fd);
            ed.concluir();
          })
        }
        className="pilha"
      >
        <input type="hidden" name="id" value={p.id} />
        <fieldset disabled={!ed.editando} className="grid grid-cols-2 gap-2">
          <label className="campo">
            Galões/mês
            <input
              className="entrada min-h-11"
              name="galoes"
              inputMode="numeric"
              defaultValue={p.galoesMes}
              disabled={p.assinantes > 0}
              title={p.assinantes > 0 ? "Tem assinantes: crie outro plano para mudar a quantidade" : undefined}
            />
          </label>
          <label className="campo">
            Preço (R$)
            <input className="entrada min-h-11" name="preco" inputMode="decimal" defaultValue={reais} />
          </label>
        </fieldset>
        {ed.editando && p.assinantes > 0 && (
          <p className="text-xs text-tinta-suave">Plano com assinantes: a quantidade fica travada. Mudança de preço vale a partir do próximo mês.</p>
        )}
        <BotoesEdicao ed={ed} salvando={salvando} pequeno />
      </form>

      {!ed.editando && (
        <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
          <form action={salvarPlano}>
            <input type="hidden" name="id" value={p.id} />
            <button name="acao" value="alternar" className={p.ativo ? "botao-peq-sec" : "botao-peq"}>
              {p.ativo ? "Pausar vendas" : "Voltar a vender"}
            </button>
          </form>
          {p.assinantes === 0 && (
            <form action={salvarPlano}>
              <input type="hidden" name="id" value={p.id} />
              <button name="acao" value="excluir" className="botao-peq-perigo">
                Excluir
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
