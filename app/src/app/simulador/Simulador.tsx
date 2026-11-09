"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { PerfilFamilia } from "@/db/schema";
import { simular, type Moradores } from "@/lib/simulador";
import { salvarFamilia } from "./actions";

const PADRAO: PerfilFamilia = { adultos: 2, criancas: 0, bebes: 0, adolescentes: 0, idosos: 0, calor: true, cozinha: true };

export default function Simulador({ inicial }: { inicial: PerfilFamilia | null }) {
  const [p, setP] = useState<PerfilFamilia>(inicial ?? PADRAO);
  const [mais, setMais] = useState(!!inicial && inicial.bebes + inicial.adolescentes + inicial.idosos > 0);
  const r = useMemo(() => simular(p, p), [p]);
  const set = (k: keyof Moradores) => (v: number) => setP((x) => ({ ...x, [k]: v }));

  return (
    <form action={salvarFamilia} className="pilha">
      <section className="cartao-elevado">
        <h2 className="titulo-secao">Quem mora na sua casa?</h2>
        <Contador nome="adultos" rotulo="Adultos" dica="18 a 59 anos · 2,5 L/dia" valor={p.adultos} onChange={set("adultos")} />
        <Contador nome="criancas" rotulo="Crianças" dica="até 13 anos · 1,3 L/dia" valor={p.criancas} onChange={set("criancas")} />
        {mais ? (
          <>
            <Contador nome="adolescentes" rotulo="Adolescentes" dica="14 a 17 anos · 2 L/dia" valor={p.adolescentes} onChange={set("adolescentes")} />
            <Contador nome="idosos" rotulo="Idosos" dica="60 anos ou mais · 2 L/dia" valor={p.idosos} onChange={set("idosos")} />
            <Contador nome="bebes" rotulo="Bebês" dica="até 1 ano · 0,7 L/dia" valor={p.bebes} onChange={set("bebes")} />
          </>
        ) : (
          <>
            <input type="hidden" name="adolescentes" value={p.adolescentes} />
            <input type="hidden" name="idosos" value={p.idosos} />
            <input type="hidden" name="bebes" value={p.bebes} />
            <button type="button" className="link-texto" onClick={() => setMais(true)}>
              + Tem bebê, adolescente ou idoso?
            </button>
          </>
        )}
      </section>

      <label className="escolha items-start">
        <input type="checkbox" name="cozinha" checked={p.cozinha} onChange={(e) => setP((x) => ({ ...x, cozinha: e.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
        <span>
          <b className="block text-[15px]">Uso a água do galão para cozinhar</b>
          <span className="text-sm text-tinta-suave">+0,5 L por pessoa por dia (café, suco, comida)</span>
        </span>
      </label>
      <label className="escolha items-start">
        <input type="checkbox" name="calor" checked={p.calor} onChange={(e) => setP((x) => ({ ...x, calor: e.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
        <span>
          <b className="block text-[15px]">Considerar o calor da região</b>
          <span className="text-sm text-tinta-suave">+20% na água de beber</span>
        </span>
      </label>

      {r ? (
        <section className="rounded-[22px] bg-rio-esc p-[18px] text-white" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[.6px] text-rio-luz">Sua família precisa de</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-titulo text-[52px] font-extrabold leading-none">
              {r.galoesSemanaMin === r.galoesSemanaMax ? r.galoesSemanaMin : `${r.galoesSemanaMin} a ${r.galoesSemanaMax}`}
            </span>
            <span className="font-titulo text-lg font-semibold">galões por semana</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            {Array.from({ length: Math.min(r.galoesSemanaMax, 14) }, (_, i) => (
              <svg key={i} width="26" height="34" viewBox="0 0 24 30" fill="#7fc8e3" stroke="#bfe3f1" strokeWidth="1.5">
                <rect x="5" y="1" width="14" height="4" rx="1" />
                <path d="M4 7h16v19a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
              </svg>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Mini rotulo="por dia" valor={`${r.litrosDia.toLocaleString("pt-BR")} L`} />
            <Mini rotulo="por semana" valor={`${r.litrosSemana} L`} />
            <Mini rotulo="por mês" valor={`${r.galoesMes} galões`} />
          </div>
        </section>
      ) : (
        <p className="cartao">Informe quantas pessoas moram na casa.</p>
      )}

      <Enviar desabilitado={!r} />
      <p className="text-xs leading-relaxed text-tinta-suave">
        Estimativa para pessoas saudáveis. Gestantes, atletas, quem trabalha exposto ao calor e pessoas com problemas renais ou cardíacos
        devem seguir orientação médica.
      </p>
    </form>
  );
}

function Enviar({ desabilitado }: { desabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="botao" disabled={desabilitado || pending}>
      {pending ? "Buscando…" : "Ver distribuidoras do meu bairro"}
    </button>
  );
}

function Mini({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-2.5">
      <span className="block text-xs text-rio-luz">{rotulo}</span>
      <b className="block text-sm">{valor}</b>
    </div>
  );
}

function Contador({ nome, rotulo, dica, valor, onChange }: { nome: string; rotulo: string; dica: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-borda py-3 last:border-0">
      <div>
        <p className="text-base font-bold">{rotulo}</p>
        <p className="text-sm text-tinta-suave">{dica}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <input type="hidden" name={nome} value={valor} />
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-borda2 bg-white text-xl font-bold text-verde disabled:opacity-40" aria-label={`Menos ${rotulo.toLowerCase()}`} disabled={valor <= 0} onClick={() => onChange(valor - 1)}>
          −
        </button>
        <span className="w-7 text-center font-titulo text-[22px] font-bold tabular-nums" aria-live="polite">
          {valor}
        </span>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-verde bg-verde text-xl font-bold text-white disabled:opacity-40" aria-label={`Mais ${rotulo.toLowerCase()}`} disabled={valor >= 20} onClick={() => onChange(valor + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
