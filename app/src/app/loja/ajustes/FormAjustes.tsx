"use client";

import { useActionState } from "react";
import type { RegrasHorario } from "@/db/schema";
import { salvarAjustes, type EstadoForm } from "./actions";

const DIAS = [
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sáb"],
  [0, "Dom"],
] as const;

type Props = {
  fazEntrega: boolean;
  fazRetirada: boolean;
  raioKm: number;
  taxaEntregaCentavos: number;
  vendeAlcool: boolean;
  regras: RegrasHorario;
};

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");

function Marcar({ nome, rotulo, ligado, children }: { nome: string; rotulo: string; ligado: boolean; children?: React.ReactNode }) {
  return (
    <label className="escolha items-start">
      <input type="checkbox" name={nome} defaultChecked={ligado} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{rotulo}</span>
        {children && <span className="text-sm text-tinta-suave">{children}</span>}
      </span>
    </label>
  );
}

export default function FormAjustes(p: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(salvarAjustes, {});
  const r = p.regras;
  return (
    <form action={enviar} className="pilha">
      <section className="cartao pilha">
        <h2 className="titulo-secao">Atendimento</h2>
        <Marcar nome="fazEntrega" rotulo="Faço entrega" ligado={p.fazEntrega} />
        <Marcar nome="fazRetirada" rotulo="Cliente pode retirar no balcão" ligado={p.fazRetirada} />
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Entrego até (km)
            <input className="entrada" name="raioKm" inputMode="decimal" defaultValue={String(p.raioKm).replace(".", ",")} />
          </label>
          <label className="campo">
            Taxa de entrega (R$)
            <input className="entrada" name="taxaEntrega" inputMode="decimal" defaultValue={reais(p.taxaEntregaCentavos)} />
          </label>
        </div>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Funcionamento</h2>
        <div className="flex flex-wrap gap-2">
          {DIAS.map(([v, t]) => (
            <label key={v} className="chip">
              <input type="checkbox" name="dias" value={v} defaultChecked={r.dias.includes(v)} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Abre
            <input className="entrada" type="time" name="abre" defaultValue={r.abre} />
          </label>
          <label className="campo">
            Fecha
            <input className="entrada" type="time" name="fecha" defaultValue={r.fecha} />
          </label>
        </div>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Horários que o cliente pode escolher</h2>
        <p className="text-sm text-tinta-suave">Período (manhã/tarde) e janela sempre ficam disponíveis. Prometa só o que consegue cumprir.</p>
        <Marcar nome="aceitaImediato" rotulo="Aceito pedido “o quanto antes”" ligado={r.aceitaImediato}>
          Para quem ficou sem água agora.
        </Marcar>
        <label className="campo">
          Prazo máximo do “o quanto antes” (minutos)
          <input className="entrada" name="prazoImediatoMin" inputMode="numeric" defaultValue={r.prazoImediatoMin} />
        </label>
        <Marcar nome="aceitaExato" rotulo="Aceito horário exato (ex.: 10h20)" ligado={r.aceitaExato}>
          Para quem só está em casa no intervalo do trabalho.
        </Marcar>
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Janela mínima (min)
            <input className="entrada" name="janelaMinimaMin" inputMode="numeric" defaultValue={r.janelaMinimaMin} />
          </label>
          <label className="campo">
            Entregas por janela
            <input className="entrada" name="capacidadePorJanela" inputMode="numeric" defaultValue={r.capacidadePorJanela} />
          </label>
        </div>
        <label className="campo">
          Taxa extra para imediato / horário exato (R$)
          <input className="entrada" name="taxaExtra" inputMode="decimal" defaultValue={reais(r.taxaExtraCentavos)} />
          <span className="text-xs font-normal text-tinta-suave">Compensa sair fora da rota. Pode ser 0.</span>
        </label>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Planos</h2>
        <label className="campo">
          Galões não usados que passam para o mês seguinte
          <input className="entrada" name="limiteAcumulo" inputMode="numeric" defaultValue={r.limiteAcumulo ?? 4} />
          <span className="text-xs font-normal text-tinta-suave">Use 0 para não acumular.</span>
        </label>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Bebida alcoólica</h2>
        <Marcar nome="vendeAlcool" rotulo="Vendo bebidas alcoólicas (18+)" ligado={p.vendeAlcool}>
          Tenho alvará, e o entregador confere documento com foto. Ao desligar, os itens alcoólicos saem do catálogo.
        </Marcar>
      </section>

      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar ajustes"}
      </button>
    </form>
  );
}
