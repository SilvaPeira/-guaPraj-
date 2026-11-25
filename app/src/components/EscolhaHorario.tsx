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

/** Primeiro minuto aceito no dia. Hoje: pelo menos 30 min à frente (mesma regra do servidor). */
function inicioMinimo(regras: RegrasCliente, ehHoje: boolean): number {
  const abre = min(regras.abre);
  return ehHoje ? Math.max(abre, Math.ceil((regras.agoraMin + 30) / 5) * 5) : abre;
}

type Periodo = ["manha" | "tarde", string, { inicio: string; fim: string }];

/** Manhã e tarde que ainda dá para escolher no dia (hoje, só as que ainda não começaram). */
function periodosDoDia(regras: RegrasCliente, ehHoje: boolean): Periodo[] {
  const todos = (
    [
      ["manha", "Manhã", regras.manha],
      ["tarde", "Tarde", regras.tarde],
    ] as const
  ).filter(([, , p]) => p !== null) as unknown as Periodo[];
  const minimo = inicioMinimo(regras, ehHoje);
  return todos.filter(([, , p]) => min(p.inicio) >= minimo);
}

/** Sugestão para horário exato / início da janela: 2 h depois de abrir; hoje, pelo menos 1 h à frente. */
function sugestaoDoDia(regras: RegrasCliente, ehHoje: boolean): number {
  const fecha = min(regras.fecha);
  const base = Math.min(Math.ceil((min(regras.abre) + 120) / 30) * 30, fecha - 60);
  if (!ehHoje) return base;
  return Math.min(Math.max(base, Math.ceil((regras.agoraMin + 60) / 30) * 30), fecha - Math.max(30, regras.janelaMinimaMin));
}

/** Loja aberta agora (para "o quanto antes"), com a mesma folga do servidor. */
const abertaAgora = (regras: RegrasCliente) => regras.agoraMin >= min(regras.abre) && regras.agoraMin + 15 <= min(regras.fecha);

function tiposPermitidos(regras: RegrasCliente, podeImediato: boolean, ehHoje = false): [Tipo, string, string][] {
  const tipos: [Tipo, string, string][] = [];
  const minimo = inicioMinimo(regras, ehHoje);
  const fecha = min(regras.fecha);
  if (podeImediato) tipos.push(["imediato", "O quanto antes", `até ${regras.prazoImediatoMin} min`]);
  if (regras.aceitaExato && minimo <= fecha) tipos.push(["exato", "Horário exato", "ex.: às 10h20"]);
  if (minimo + regras.janelaMinimaMin <= fecha) tipos.push(["janela", "Janela", `mínimo ${regras.janelaMinimaMin} min`]);
  if (periodosDoDia(regras, ehHoje).length) tipos.push(["periodo", "Manhã ou tarde", "mais flexível"]);
  return tipos;
}

function estadoInicial(regras: RegrasCliente, datas: OpcaoData[] | undefined, inicial?: Inicial, imediatoPossivel = false): Estado {
  const ehHoje = datas?.[0]?.ehHoje ?? false;
  const sugestao = sugestaoDoDia(regras, ehHoje);
  const tipos = tiposPermitidos(regras, imediatoPossivel && ehHoje && abertaAgora(regras), ehHoje).map(([t]) => t);
  const preferidos: Tipo[] = ["imediato", "periodo", "janela", "exato"];
  const periodos = periodosDoDia(regras, ehHoje);
  return {
    data: datas?.[0]?.data ?? "",
    tipo: inicial?.tipo ?? preferidos.find((t) => tipos.includes(t)) ?? "periodo",
    exato: inicial?.tipo === "exato" ? inicial.inicio : hhmm(sugestao),
    jIni: inicial?.tipo === "janela" ? inicial.inicio : hhmm(sugestao),
    jFim: inicial?.tipo === "janela" ? inicial.fim : hhmm(sugestao + Math.max(30, regras.janelaMinimaMin)),
    periodo:
      inicial?.tipo === "periodo" && regras.tarde && inicial.inicio === regras.tarde.inicio
        ? "tarde"
        : (periodos[0]?.[0] ?? (regras.manha ? "manha" : "tarde")),
  };
}

function derivarValor(regras: RegrasCliente, e: Estado, podeImediato: boolean, ehHoje = false): ValorHorario {
  const permitidos = tiposPermitidos(regras, podeImediato, ehHoje).map(([x]) => x);
  const t = permitidos.includes(e.tipo) ? e.tipo : (permitidos[0] ?? "periodo");
  if (t === "exato") return { tipo: t, inicio: e.exato, fim: e.exato, data: e.data };
  if (t === "janela") return { tipo: t, inicio: e.jIni, fim: e.jFim, data: e.data };
  if (t === "imediato") return { tipo: t, inicio: "", fim: "", data: e.data };
  const periodos = periodosDoDia(regras, ehHoje);
  const p = periodos.find(([k]) => k === e.periodo)?.[2] ?? periodos[0]?.[2] ?? regras.manha ?? regras.tarde;
  return { tipo: "periodo", inicio: p?.inicio ?? "", fim: p?.fim ?? "", data: e.data };
}

/** Valor inicial do horário de um plano (sem “o quanto antes”), igual ao que o componente mostra. */
export function valorInicialPlano(regras: RegrasCliente, inicial?: Inicial): ValorHorario {
  return derivarValor(regras, estadoInicial(regras, undefined, inicial), false);
}

/** Valor inicial do horário de um pedido avulso (o mesmo que o componente mostra ao abrir). */
export function valorInicialPedido(regras: RegrasCliente, datas: OpcaoData[], ehEntrega: boolean): ValorHorario {
  const imediatoPossivel = ehEntrega && regras.aceitaImediato;
  const ehHoje = datas[0]?.ehHoje ?? false;
  return derivarValor(regras, estadoInicial(regras, datas, undefined, imediatoPossivel), imediatoPossivel && ehHoje && abertaAgora(regras), ehHoje);
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
  const imediatoPossivel = !ehPlano && ehEntrega && regras.aceitaImediato;
  const [s, setS] = useState<Estado>(() => estadoInicial(regras, datas, inicial, imediatoPossivel));
  const ehHojeDe = (data: string) => datas?.find((d) => d.data === data)?.ehHoje ?? false;
  const ehHoje = ehHojeDe(s.data);
  const podeImediato = imediatoPossivel && ehHoje && abertaAgora(regras);
  const tipos = tiposPermitidos(regras, podeImediato, ehHoje);
  const v = derivarValor(regras, s, podeImediato, ehHoje);
  const periodos = periodosDoDia(regras, ehHoje);
  const minimoHoje = ehHoje ? hhmm(inicioMinimo(regras, true)) : regras.abre;

  function mudar(patch: Partial<Estado>) {
    let novo = { ...s, ...patch };
    const hojeNovo = ehHojeDe(novo.data);
    // Trocou para hoje com um horário que já passou: puxa para o primeiro horário que ainda vale.
    if (patch.data && hojeNovo) {
      const sug = sugestaoDoDia(regras, true);
      const minimo = inicioMinimo(regras, true);
      if (min(novo.exato) < minimo) novo = { ...novo, exato: hhmm(sug) };
      if (min(novo.jIni) < minimo) novo = { ...novo, jIni: hhmm(sug), jFim: hhmm(sug + Math.max(30, regras.janelaMinimaMin)) };
    }
    setS(novo);
    onChange?.(derivarValor(regras, novo, imediatoPossivel && hojeNovo && abertaAgora(regras), hojeNovo));
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
            <input className="entrada" type="time" step={300} min={minimoHoje} max={regras.fecha} value={s.exato} onChange={(e) => mudar({ exato: e.target.value })} />
          </label>
        )}
        {v.tipo === "janela" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="campo">
              Entre
              <input className="entrada" type="time" step={300} min={minimoHoje} max={regras.fecha} value={s.jIni} onChange={(e) => mudar({ jIni: e.target.value })} />
            </label>
            <label className="campo">
              e
              <input className="entrada" type="time" step={300} min={minimoHoje} max={regras.fecha} value={s.jFim} onChange={(e) => mudar({ jFim: e.target.value })} />
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
