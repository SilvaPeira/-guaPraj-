"use client";

import { useActionState } from "react";
import { enviarSemLimpar } from "@/lib/formulario";
import { salvarCategoria, type EstadoCategoria } from "./actions";

type Tipo = { tipo: string; nome: string; regras: string };
type Categoria = { id?: string; nome: string; tipo: string; ordem: number };

export default function FormCategoria({ c, tipos }: { c: Categoria; tipos: Tipo[] }) {
  const [estado, enviar, enviando] = useActionState<EstadoCategoria, FormData>(salvarCategoria, {});
  const novo = !c.id;
  return (
    <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="campo">
          Nome que o cliente vê
          <input className="entrada" name="nome" required maxLength={40} defaultValue={c.nome} placeholder="Ex.: Cervejas, Destilados, Gelo" />
        </label>
        <label className="campo w-20">
          Ordem
          <input className="entrada" name="ordem" inputMode="numeric" defaultValue={c.ordem} />
        </label>
      </div>
      {novo && (
        <label className="campo">
          Tipo (define as regras)
          <select className="entrada" name="tipo" defaultValue="">
            <option value="" disabled>
              Escolha…
            </option>
            {tipos.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.nome} — {t.regras}
              </option>
            ))}
          </select>
        </label>
      )}
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
        {enviando ? "Salvando…" : novo ? "Criar categoria" : "Salvar"}
      </button>
    </form>
  );
}
