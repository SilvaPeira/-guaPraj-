"use client";

import { useActionState, useState } from "react";
import { enviarSemLimpar } from "@/lib/formulario";
import { definirBeneficio, type EstadoBeneficio } from "../actions";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Admin: desconto na mensalidade (%, com prazo opcional) e/ou não cobrar por um período. */
export default function BeneficioLoja(p: {
  lojaId: string;
  precoCentavos: number | null;
  desconto: number | null;
  descontoAte: string | null;
  gratisAte: string | null;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoBeneficio, FormData>(definirBeneficio, {});
  const [pct, setPct] = useState(p.desconto ? String(p.desconto) : "");
  const n = Number(pct);
  const comDesconto = p.precoCentavos && n > 0 && n <= 100 ? Math.round((p.precoCentavos * (100 - n)) / 100) : null;
  const tem = !!(p.desconto || p.gratisAte);
  // Abre sozinho se já tem benefício; depois fica como o admin deixar (não fecha ao salvar).
  const [aberto, setAberto] = useState(tem);
  return (
    <details className="rounded-xl bg-fundo p-3" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold">Desconto ou período grátis {tem ? "· ativo" : ""}</summary>
      <form onSubmit={enviarSemLimpar(enviar)} className="pilha mt-3">
        <input type="hidden" name="lojaId" value={p.lojaId} />
        <div className="grid grid-cols-2 gap-2">
          <label className="campo">
            Desconto (%)
            <input className="entrada min-h-11" name="desconto" inputMode="numeric" placeholder="Ex.: 50" value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 3))} />
          </label>
          <label className="campo">
            Desconto até
            <input className="entrada min-h-11" type="date" name="descontoAte" defaultValue={p.descontoAte ?? ""} />
          </label>
        </div>
        {comDesconto !== null && p.precoCentavos !== null && (
          <p className="text-sm" aria-live="polite">
            Mensalidade: <s className="text-tinta-suave">{brl(p.precoCentavos)}</s> <b>{brl(comDesconto)}</b>
            {n === 100 ? " (sem cobrar enquanto durar)" : ""}. Sem data = vale até você tirar.
          </p>
        )}
        <label className="campo">
          Não cobrar até (grátis)
          <input className="entrada min-h-11" type="date" name="gratisAte" defaultValue={p.gratisAte ?? ""} />
          <span className="text-xs font-normal text-tinta-suave">A loja usa o plano escolhido sem pagar até esse dia. Depois volta a cobrar normal (ou com o desconto).</span>
        </label>
        {estado.erro && (
          <p role="alert" className="aviso-erro text-sm">
            {estado.erro}
          </p>
        )}
        {estado.ok && (
          <p role="status" className="aviso-ok text-sm">
            {estado.ok}
          </p>
        )}
        <button className="botao-peq self-start" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar benefício"}
        </button>
      </form>
    </details>
  );
}
