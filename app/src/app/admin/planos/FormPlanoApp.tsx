"use client";

import { useActionState } from "react";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { salvarPlanoApp, type EstadoPlanoApp } from "../actions";
import { enviarSemLimpar } from "@/lib/formulario";

export type DadosPlanoApp = {
  id?: string;
  nome: string;
  precoCentavos: number;
  descricao: string | null;
  limiteAssinantes: number | null;
  limiteEntregadores: number | null;
  pagamentoOnline: boolean;
  produtosExtras: boolean;
  appProprio: boolean;
  ordem: number;
};

/** Mesmo formulário para criar (já liberado) e editar (bloqueado até "Editar"). */
export default function FormPlanoApp({ p, novo = false }: { p: DadosPlanoApp; novo?: boolean }) {
  const [e, enviar, salvando] = useActionState<EstadoPlanoApp, FormData>(salvarPlanoApp, {});
  const ed = useEdicao(e, novo);
  const reais = (p.precoCentavos / 100).toFixed(2).replace(".", ",");
  return (
    <form key={ed.chave} onSubmit={enviarSemLimpar(enviar)} className="pilha">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <fieldset disabled={!ed.editando && !novo} className="pilha">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="campo">
            Nome
            <input className="entrada min-h-11" name="nome" defaultValue={p.nome} required maxLength={40} placeholder="Ex.: Essencial" />
          </label>
          <label className="campo w-32">
            Preço/mês (R$)
            <input className="entrada min-h-11" name="preco" inputMode="decimal" defaultValue={reais} />
          </label>
        </div>
        <label className="campo">
          Descrição (aparece para as lojas)
          <input className="entrada min-h-11" name="descricao" defaultValue={p.descricao ?? ""} maxLength={200} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="campo">
            Máx. assinantes
            <input className="entrada min-h-11" name="limiteAssinantes" inputMode="numeric" defaultValue={p.limiteAssinantes ?? ""} placeholder="ilimitado" />
          </label>
          <label className="campo">
            Máx. entregadores
            <input className="entrada min-h-11" name="limiteEntregadores" inputMode="numeric" defaultValue={p.limiteEntregadores ?? ""} placeholder="ilimitado" />
          </label>
          <label className="campo">
            Ordem
            <input className="entrada min-h-11" name="ordem" inputMode="numeric" defaultValue={p.ordem} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pagamentoOnline" defaultChecked={p.pagamentoOnline} className="h-5 w-5 accent-verde" />
          Cliente paga pelo app (Pix e cartão)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="produtosExtras" defaultChecked={p.produtosExtras} className="h-5 w-5 accent-verde" />
          Pode vender bebidas, gelo e polpas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="appProprio" defaultChecked={p.appProprio} className="h-5 w-5 accent-verde" />
          App próprio (site e app instalável com a marca da loja)
        </label>
      </fieldset>
      {e.erro && (
        <p role="alert" className="aviso-erro text-sm">
          {e.erro}
        </p>
      )}
      {e.ok && !ed.editando && !novo && <p className="aviso-ok text-sm">{e.ok}</p>}
      {novo ? (
        <button className="botao" disabled={salvando}>
          {salvando ? "Salvando…" : "Criar plano"}
        </button>
      ) : (
        <BotoesEdicao ed={ed} salvando={salvando} pequeno />
      )}
    </form>
  );
}
