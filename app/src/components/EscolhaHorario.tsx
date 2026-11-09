"use client";

import { useState } from "react";
import type { OpcaoData, RegrasCliente } from "@/lib/opcoes-pedido";

export type Tipo = "imediato" | "exato" | "janela" | "periodo";
export type ValorHorario = { tipo: Tipo; inicio: string; fim: string; data: string };
type Inicial = { tipo: Tipo; inicio: string; fim: string };
type Estado = { data: string; tipo: Tipo; exato: string; jIni: string; jFim: string; periodo: "manha" | "tarde" };

const min = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function tiposPermitidos(regras: RegrasCliente, podeImediato: boolean): [Tipo, string, string][] {
  const tipos: [Tipo, string, string][] = [];
  if (podeImediato) tipos.push(["imediato", "O quanto antes", `até ${regras.prazoImediatoMin} min`]);
  if (regras.aceitaExato) tipos.push(["exato", "Horário exato", "ex.: às 10h20"]);
  tipos.push(["janela", "Janela", `mínimo ${regras.janelaMinimaMin} min`]);
  tipos.push(["periodo", "Manhã ou tarde", "mais flexível"]);
  return tipos;
}

function estadoInicial(regras: RegrasCliente, datas: OpcaoData[] | undefined, inicial?: Inicial): Estado {
  const sugestao = Math.min(Math.ceil((min(regras.abre) + 120) / 30) * 30, min(regras.fecha) - 60);
  return {
    data: datas?.[0]?.data ?? "",
    tipo: inicial?.tipo ?? "periodo",
    exato: inicial?.tipo === "exato" ? inicial.inicio : hhmm(sugestao),
    jIni: inicial?.tipo === "janela" ? inicial.inicio : hhmm(sugestao),
    jFim: inicial?.tipo === "janela" ? inicial.fim : hhmm(sugestao + Math.max(30, regras.janelaMinimaMin)),
    periodo: inicial?.tipo === "periodo" && regras.tarde && inicial.inicio === regras.tarde.inicio ? "tarde" : regras.manha ? "manha" : "tarde",
  };
}

function derivarValor(regras: RegrasCliente, e: Estado, podeImediato: boolean): ValorHorario {
  const t = tiposPermitidos(regras, podeImediato).some(([x]) => x === e.tipo) ? e.tipo : "periodo";
  if (t === "exato") return { tipo: t, inicio: e.exato, fim: e.exato, data: e.data };
  if (t === "janela") return { tipo: t, inicio: e.jIni, fim: e.jFim, data: e.data };
  if (t === "imediato") return { tipo: t, inicio: "", fim: "", data: e.data };
  const p = (e.periodo === "tarde" ? regras.tarde : regras.manha) ?? regras.manha ?? regras.tarde;
  return { tipo: "periodo", inicio: p?.inicio ?? "", fim: p?.fim ?? "", data: e.data };
}

/** Valor inicial do horário de um plano (sem “o quanto antes”), igual ao que o componente mostra. */
export function valorInicialPlano(regras: RegrasCliente, inicial?: Inicial): ValorHorario {
  return derivarValor(regras, estadoInicial(regras, undefined, inicial), false);
}

/**
 * Escolha de horário (seção 3 do plano): o quanto antes, horário exato, janela ou período.
 * Envia no formulário: data, tipoHorario, inicio, fim.
 */
export default function EscolhaHorario({
  regras,
  datas,
  ehPlano = false,
  ehEntrega = true,
  inicial,
  onChange,
}: {
  regras: RegrasCliente;
  datas?: OpcaoData[];
  ehPlano?: boolean;
  ehEntrega?: boolean;
  inicial?: Inicial;
  onChange?: (v: ValorHorario) => void;
}) {
  const [s, setS] = useState<Estado>(() => estadoInicial(regras, datas, inicial));
  const ehHoje = datas?.find((d) => d.data === s.data)?.ehHoje ?? false;
  const podeImediato = !ehPlano && ehEntrega && regras.aceitaImediato && ehHoje;
  const tipos = tiposPermitidos(regras, podeImediato);
  const v = derivarValor(regras, s, podeImediato);
  const periodos = (
    [
      ["manha", "Manhã", regras.manha],
      ["tarde", "Tarde", regras.tarde],
    ] as const
  ).filter(([, , p]) => p !== null) as unknown as ["manha" | "tarde", string, { inicio: string; fim: string }][];

  function mudar(patch: Partial<Estado>) {
    const novo = { ...s, ...patch };
    setS(novo);
    const hojeNovo = datas?.find((d) => d.data === novo.data)?.ehHoje ?? false;
    onChange?.(derivarValor(regras, novo, !ehPlano && ehEntrega && regras.aceitaImediato && hojeNovo));
  }

  return (
    <div className="pilha">
      {datas && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Quando?</legend>
          <div className="flex flex-wrap gap-2">
            {datas.map((d) => (
              <label key={d.data} className="chip">
                <input type="radio" name="data" value={d.data} checked={s.data === d.data} onChange={() => mudar({ data: d.data })} className="sr-only" />
                {d.rotulo}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="pilha">
        <legend className="mb-2 text-sm font-semibold">Horário</legend>
        <div className="grid grid-cols-2 gap-2">
          {tipos.map(([t, rot, dica]) => (
            <label key={t} className="escolha flex-col gap-0.5 p-2.5">
              <input type="radio" name="tipoHorario" value={t} checked={v.tipo === t} onChange={() => mudar({ tipo: t })} className="sr-only" />
              <b className="text-sm">{rot}</b>
              <span className="text-xs text-tinta-suave">{dica}</span>
            </label>
          ))}
        </div>

        {v.tipo === "exato" && (
          <label className="campo">
            Às
            <input className="entrada" type="time" step={300} min={regras.abre} max={regras.fecha} value={s.exato} onChange={(e) => mudar({ exato: e.target.value })} />
          </label>
        )}
        {v.tipo === "janela" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="campo">
              Entre
              <input className="entrada" type="time" step={300} min={regras.abre} max={regras.fecha} value={s.jIni} onChange={(e) => mudar({ jIni: e.target.value })} />
            </label>
            <label className="campo">
              e
              <input className="entrada" type="time" step={300} min={regras.abre} max={regras.fecha} value={s.jFim} onChange={(e) => mudar({ jFim: e.target.value })} />
            </label>
          </div>
        )}
        {v.tipo === "periodo" && (
          <div className="flex flex-wrap gap-2">
            {periodos.map(([k, rot, p]) => (
              <label key={k} className="chip">
                <input type="radio" name="periodo" value={k} checked={s.periodo === k} onChange={() => mudar({ periodo: k })} className="sr-only" />
                {rot} ({p.inicio}–{p.fim})
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-tinta-suave">
          A loja atende das {regras.abre} às {regras.fecha}.
          {!ehPlano && ehEntrega && (v.tipo === "imediato" || v.tipo === "exato") && regras.taxaExtraCentavos > 0
            ? ` Taxa extra para esse horário: ${(regras.taxaExtraCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
            : ""}
        </p>
      </fieldset>
      <input type="hidden" name="inicio" value={v.inicio} />
      <input type="hidden" name="fim" value={v.fim} />
    </div>
  );
}
