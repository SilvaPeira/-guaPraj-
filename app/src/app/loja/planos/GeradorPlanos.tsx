"use client";

import { useActionState, useState } from "react";
import { enviarSemLimpar } from "@/lib/formulario";
import { gerar, lerPedido, validar } from "@/lib/gerador-planos";
import { reaisParaCentavos } from "@/lib/validacao";
import { gerarPlanos, type EstadoGerador } from "./actions";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Gerar planos a partir do valor do galão: um plano (quantidade) ou vários de uma vez (múltiplos),
 * com acréscimo ou desconto em %. Mostra a prévia antes de criar.
 */
export default function GeradorPlanos({ valorGalaoCentavos, existentes }: { valorGalaoCentavos: number; existentes: number[] }) {
  const [estado, enviar, enviando] = useActionState<EstadoGerador, FormData>(gerarPlanos, {});
  const [v, setV] = useState({
    valorGalao: valorGalaoCentavos ? (valorGalaoCentavos / 100).toFixed(2).replace(".", ",") : "",
    modo: "multiplos",
    galoes: "12",
    passo: "4",
    inicio: "8",
    ate: "32",
    sentido: "acrescimo",
    ajuste: "0",
  });
  const muda = (campo: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [campo]: e.target.value }));
  const pedido = lerPedido((c) => v[c as keyof typeof v] ?? "", (s) => reaisParaCentavos(s));
  const erro = validar(pedido);
  const previa = erro ? [] : gerar(pedido);
  const jaTem = new Set(existentes);
  const criar = previa.filter((p) => !jaTem.has(p.galoes));

  return (
    <form onSubmit={enviarSemLimpar(enviar)} className="cartao pilha">
      <h2 className="titulo-secao">Gerar planos pelo valor do galão</h2>
      <p className="text-sm text-tinta-suave">Informe quanto vale o galão e o sistema calcula o preço de cada plano. Dá para pôr acréscimo ou desconto em %.</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Valor do galão (R$)
          <input className="entrada" name="valorGalao" inputMode="decimal" required value={v.valorGalao} onChange={muda("valorGalao")} placeholder="Ex.: 7,99" />
        </label>
      </div>

      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm font-semibold">Quantos planos?</legend>
        {(
          [
            ["um", "Um plano", "informo os galões"],
            ["multiplos", "Vários (múltiplos)", "ex.: 8, 12, 16…"],
          ] as const
        ).map(([m, t, d]) => (
          <label key={m} className="escolha flex-col items-start p-2.5 text-sm">
            <input type="radio" name="modo" value={m} checked={v.modo === m} onChange={muda("modo")} className="sr-only" />
            <b>{t}</b>
            <span className="text-xs text-tinta-suave">{d}</span>
          </label>
        ))}
      </fieldset>

      {v.modo === "um" ? (
        <label className="campo">
          Galões por mês
          <input className="entrada" name="galoes" inputMode="numeric" value={v.galoes} onChange={muda("galoes")} placeholder="Ex.: 12" />
        </label>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <label className="campo">
            De quantos em quantos
            <input className="entrada" name="passo" inputMode="numeric" value={v.passo} onChange={muda("passo")} placeholder="4" />
          </label>
          <label className="campo">
            Primeiro plano
            <input className="entrada" name="inicio" inputMode="numeric" value={v.inicio} onChange={muda("inicio")} placeholder="8" />
          </label>
          <label className="campo">
            Último plano
            <input className="entrada" name="ate" inputMode="numeric" value={v.ate} onChange={muda("ate")} placeholder="32" />
          </label>
        </div>
      )}

      <fieldset className="pilha">
        <legend className="mb-2 text-sm font-semibold">Ajuste sobre o valor do galão</legend>
        <div className="grid grid-cols-[1fr_1fr_6rem] gap-2">
          {(
            [
              ["acrescimo", "+ Acréscimo"],
              ["desconto", "− Desconto"],
            ] as const
          ).map(([s, t]) => (
            <label key={s} className="escolha items-center justify-center p-2.5 text-sm font-semibold">
              <input type="radio" name="sentido" value={s} checked={v.sentido === s} onChange={muda("sentido")} className="sr-only" />
              {t}
            </label>
          ))}
          <label className="campo">
            <span className="sr-only">Percentual</span>
            <span className="relative">
              <input className="entrada w-full pr-7" name="ajuste" inputMode="decimal" aria-label="Percentual do ajuste" value={v.ajuste} onChange={muda("ajuste")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-suave">%</span>
            </span>
          </label>
        </div>
        <span className="text-xs text-tinta-suave">0% = preço cheio (galões × valor do galão). Ex.: 12 × R$ 7,99 = R$ 95,88; com +10% = R$ 105,47.</span>
      </fieldset>

      {erro ? (
        <p className="text-sm text-tinta-suave">{erro}</p>
      ) : (
        <div className="pilha" aria-live="polite">
          <b className="text-sm">Prévia</b>
          <ul className="divide-y divide-borda rounded-xl border border-borda">
            {previa.map((p) => (
              <li key={p.galoes} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${jaTem.has(p.galoes) ? "text-tinta-suave" : ""}`}>
                <span>
                  <b>{p.galoes} galões/mês</b> · {brl(Math.round(p.precoCentavos / p.galoes))} o galão
                </span>
                <span className="flex-none text-right">
                  <b>{brl(p.precoCentavos)}</b>
                  {jaTem.has(p.galoes) && <span className="block text-xs">já existe</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
      <button className="botao" disabled={enviando || !!erro || criar.length === 0}>
        {enviando ? "Gerando…" : criar.length === 0 && !erro ? "Esses planos já existem" : `Gerar ${criar.length === 1 ? "1 plano" : `${criar.length} planos`}`}
      </button>
    </form>
  );
}
