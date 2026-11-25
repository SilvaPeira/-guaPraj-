"use client";

import { useActionState } from "react";
import dynamic from "next/dynamic";
import { salvarCidade, type EstadoCidade } from "./actions";

const MapaPin = dynamic(() => import("@/components/MapaPin"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-borda" />,
});

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

type Cidade = { id?: string; nome: string; uf: string; lat: number | null; lng: number | null; ordem: number };

export default function FormCidade({ c }: { c: Cidade }) {
  const [estado, enviar, enviando] = useActionState<EstadoCidade, FormData>(salvarCidade, {});
  const novo = !c.id;
  return (
    <form action={enviar} className="pilha">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <label className="campo">
          Cidade
          <input className="entrada" name="nome" required maxLength={80} defaultValue={c.nome} placeholder="Ex.: Parauapebas" />
        </label>
        <label className="campo">
          UF
          <select className="entrada" name="uf" defaultValue={c.uf || "PA"}>
            {UFS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="campo w-20">
          Ordem
          <input className="entrada" name="ordem" inputMode="numeric" defaultValue={c.ordem} />
        </label>
      </div>
      <div className="campo">
        Centro da cidade (onde o mapa abre para o cliente e a loja)
        <MapaPin inicial={c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null} cidade={c.nome || "Brasil"} />
      </div>
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
        {enviando ? "Salvando…" : novo ? "Adicionar cidade" : "Salvar"}
      </button>
    </form>
  );
}
