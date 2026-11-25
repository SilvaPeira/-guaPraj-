"use client";

import { useActionState } from "react";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { definirPlanoLoja, type EstadoPlanoLoja } from "../actions";

type Props = {
  lojaId: string;
  planoId: string | null;
  pagoAte: string | null;
  planos: { id: string; nome: string; precoCentavos: number; ativo: boolean }[];
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PlanoDaLoja(p: Props) {
  const [e, enviar, salvando] = useActionState<EstadoPlanoLoja, FormData>(definirPlanoLoja, {});
  const ed = useEdicao(e);
  return (
    <form key={ed.chave} action={enviar} className="pilha">
      <input type="hidden" name="lojaId" value={p.lojaId} />
      <fieldset disabled={!ed.editando} className="grid grid-cols-2 gap-2">
        <label className="campo">
          Plano
          <select className="entrada min-h-11" name="planoId" defaultValue={p.planoId ?? ""}>
            <option value="">Nenhum (regras do grátis)</option>
            {p.planos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome} · {x.precoCentavos ? brl(x.precoCentavos) : "grátis"}
                {x.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Pago até
          <input className="entrada min-h-11" type="date" name="pagoAte" defaultValue={p.pagoAte ?? ""} />
        </label>
      </fieldset>
      {e.erro && (
        <p role="alert" className="aviso-erro text-sm">
          {e.erro}
        </p>
      )}
      {e.ok && !ed.editando && <p className="aviso-ok text-sm">{e.ok}</p>}
      <BotoesEdicao ed={ed} salvando={salvando} pequeno textoEditar="Editar plano" />
    </form>
  );
}
