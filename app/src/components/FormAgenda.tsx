"use client";

import { useActionState, useState } from "react";
import EscolhaHorario, { valorInicialPlano, type ValorHorario } from "./EscolhaHorario";
import type { AgendaPlano } from "@/db/schema";
import type { RegrasCliente } from "@/lib/opcoes-pedido";
import { galoesPorMes, textoAceite } from "@/lib/agenda";

const DIAS = [
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sáb"],
  [0, "Dom"],
] as const;

type Freq = AgendaPlano["frequencia"];
export type EstadoAgenda = { erro?: string };

type Props = {
  acao: (estado: EstadoAgenda, form: FormData) => Promise<EstadoAgenda>;
  camposExtras?: Record<string, string>;
  planoGaloes: number;
  regras: RegrasCliente;
  diasLoja: number[];
  podeEntregar: boolean;
  podeRetirar: boolean;
  inicial?: { agenda: AgendaPlano; modo: "entrega" | "retirada" } | null;
  precoCascoCentavos?: number | null;
  textoBotao: string;
};

function sugerirQtd(planoGaloes: number, freq: Freq, nDias: number) {
  const entregas = freq === "semanal" ? nDias * 4.33 : freq === "quinzenal" ? 2.17 : 1;
  // Arredonda para baixo (com folga) para não passar do plano sem o cliente perceber.
  return Math.max(1, Math.floor(planoGaloes / entregas + 0.25));
}

export default function FormAgenda(p: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoAgenda, FormData>(p.acao, {});
  const ini = p.inicial?.agenda;
  const [freq, setFreq] = useState<Freq>(ini?.frequencia ?? (p.planoGaloes < 4 ? "mensal" : "semanal"));
  const [dias, setDias] = useState<number[]>(ini?.dias ?? [p.diasLoja.includes(1) ? 1 : p.diasLoja[0]]);
  const [qtd, setQtd] = useState(ini?.qtdPorEntrega ?? sugerirQtd(p.planoGaloes, p.planoGaloes < 4 ? "mensal" : "semanal", 1));
  const [modo, setModo] = useState<"entrega" | "retirada">(p.inicial?.modo ?? (p.podeEntregar ? "entrega" : "retirada"));
  const horarioIni = ini ? { tipo: ini.tipoHorario, inicio: ini.inicio, fim: ini.fim } : ({ tipo: "exato", inicio: "09:00", fim: "09:00" } as const);
  const [horario, setHorario] = useState<ValorHorario>(() => valorInicialPlano(p.regras, horarioIni));
  const [casco, setCasco] = useState<"tenho" | "comprar">("tenho");
  const [aceite, setAceite] = useState(false);

  const porMes = galoesPorMes({ frequencia: freq, dias, qtdPorEntrega: qtd });
  const diferenca = porMes - p.planoGaloes;
  const texto = dias.length ? textoAceite({ frequencia: freq, dias, qtdPorEntrega: qtd, tipoHorario: horario.tipo as "exato" | "janela" | "periodo", inicio: horario.inicio, fim: horario.fim }, modo) : "";
  // Qualquer mudança exige confirmar a ciência de novo.
  const mudou = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setAceite(false);
  };

  function escolherFreq(f: Freq) {
    mudou(setFreq)(f);
    const d = f === "semanal" ? dias : dias.slice(0, 1);
    setDias(d);
    setQtd(sugerirQtd(p.planoGaloes, f, d.length));
  }
  function alternarDia(d: number) {
    setAceite(false);
    if (freq !== "semanal") return setDias([d]);
    const novo = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].slice(-3);
    setDias(novo.length ? novo : [d]);
    setQtd(sugerirQtd(p.planoGaloes, freq, Math.max(1, novo.length)));
  }

  return (
    <form action={enviar} className="pilha">
      {Object.entries(p.camposExtras ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <section className="cartao pilha">
        <h2 className="titulo-secao">Com que frequência?</h2>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["semanal", "Toda semana"],
              ["quinzenal", "A cada 15 dias"],
              ["mensal", "1 vez por mês"],
            ] as const
          ).map(([f, rot]) => (
            <label key={f} className="escolha items-center justify-center p-2.5 text-center text-sm font-semibold">
              <input type="radio" name="frequencia" value={f} checked={freq === f} onChange={() => escolherFreq(f)} className="sr-only" />
              {rot}
            </label>
          ))}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{freq === "semanal" ? "Em quais dias? (até 3)" : "Em qual dia da semana?"}</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS.filter(([d]) => p.diasLoja.includes(d)).map(([d, rot]) => (
              <label key={d} className="chip">
                <input type={freq === "semanal" ? "checkbox" : "radio"} name="dias" value={d} checked={dias.includes(d)} onChange={() => alternarDia(d)} className="sr-only" />
                {rot}
              </label>
            ))}
          </div>
          {freq === "mensal" && <p className="mt-2 text-xs text-tinta-suave">Na primeira semana de cada mês.</p>}
        </fieldset>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Galões por entrega</span>
          <div className="flex items-center gap-2">
            <input type="hidden" name="qtdPorEntrega" value={qtd} />
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-borda2 bg-white text-lg font-bold text-verde disabled:opacity-40" aria-label="Menos galões por entrega" disabled={qtd <= 1} onClick={() => mudou(setQtd)(qtd - 1)}>
              −
            </button>
            <span className="w-6 text-center font-titulo text-lg font-bold">{qtd}</span>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-verde bg-verde text-lg font-bold text-white disabled:opacity-40" aria-label="Mais galões por entrega" disabled={qtd >= 30} onClick={() => mudou(setQtd)(qtd + 1)}>
              +
            </button>
          </div>
        </div>
        <p className={diferenca > 1 ? "aviso-erro text-sm" : diferenca < -1 ? "aviso-info text-sm" : "aviso-ok text-sm"} aria-live="polite">
          Essa agenda dá cerca de <b>{porMes} galões/mês</b> · seu plano tem {p.planoGaloes}.{" "}
          {diferenca > 1
            ? `Os ${diferenca} a mais são cobrados como galão extra, pelo preço do plano.`
            : diferenca < -1
              ? "O que sobrar passa para o mês seguinte, até o limite da loja."
              : "Combina com o seu plano."}
        </p>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">{modo === "entrega" ? "Horário da entrega" : "Horário da retirada"}</h2>
        {p.podeEntregar && p.podeRetirar && (
          <div className="grid grid-cols-2 gap-2">
            <label className="escolha items-center p-2.5 text-sm font-semibold">
              <input type="radio" name="modo" value="entrega" checked={modo === "entrega"} onChange={() => mudou(setModo)("entrega")} className="sr-only" />
              Entregar em casa
            </label>
            <label className="escolha items-center p-2.5 text-sm font-semibold">
              <input type="radio" name="modo" value="retirada" checked={modo === "retirada"} onChange={() => mudou(setModo)("retirada")} className="sr-only" />
              Vou retirar
            </label>
          </div>
        )}
        {!(p.podeEntregar && p.podeRetirar) && <input type="hidden" name="modo" value={modo} />}
        <EscolhaHorario
          regras={p.regras}
          ehPlano
          ehEntrega={modo === "entrega"}
          inicial={horarioIni}
          onChange={mudou(setHorario)}
        />
      </section>

      {p.precoCascoCentavos !== undefined && (
        <section className="cartao pilha">
          <h2 className="titulo-secao">Vasilhames (cascos)</h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="escolha items-center p-2.5 text-sm">
              <input type="radio" name="casco" value="tenho" checked={casco === "tenho"} onChange={() => setCasco("tenho")} className="sr-only" />
              Já tenho {qtd} para trocar
            </label>
            {p.precoCascoCentavos !== null && (
              <label className="escolha items-center p-2.5 text-sm">
                <input type="radio" name="casco" value="comprar" checked={casco === "comprar"} onChange={() => setCasco("comprar")} className="sr-only" />
                Preciso comprar {qtd} ({((p.precoCascoCentavos * qtd) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, só na 1ª entrega)
              </label>
            )}
          </div>
          <input type="hidden" name="cascosComprar" value={casco === "comprar" ? qtd : 0} />
        </section>
      )}

      {texto && (
        <label className="escolha items-start border-2 border-acai bg-acai-claro">
          <input type="checkbox" name="aceite" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
          <span className="text-[15px] leading-snug">{texto}</span>
        </label>
      )}

      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando || !aceite || !dias.length}>
        {enviando ? "Salvando…" : p.textoBotao}
      </button>
    </form>
  );
}
