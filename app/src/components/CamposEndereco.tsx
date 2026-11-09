"use client";

import dynamic from "next/dynamic";
import { CIDADES } from "@/lib/validacao";

const MapaPin = dynamic(() => import("./MapaPin"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-borda" />,
});

export type EnderecoInicial = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  referencia?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/** Campos de endereço + mapa. Usado pelo cliente e pela loja. */
export default function CamposEndereco({ inicial, comReferencia = true }: { inicial?: EnderecoInicial | null; comReferencia?: boolean }) {
  const pos = inicial?.lat != null && inicial?.lng != null ? { lat: inicial.lat, lng: inicial.lng } : null;
  return (
    <>
      <div className="campo">
        Onde fica? Marque no mapa
        <MapaPin inicial={pos} />
      </div>
      <label className="campo">
        Cidade
        <select className="entrada" name="cidade" defaultValue={inicial?.cidade ?? CIDADES[0]}>
          {CIDADES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        Bairro
        <input className="entrada" name="bairro" required maxLength={80} defaultValue={inicial?.bairro ?? ""} placeholder="Ex.: Novo Brasil" />
      </label>
      <label className="campo">
        Rua
        <input className="entrada" name="logradouro" required maxLength={120} autoComplete="address-line1" defaultValue={inicial?.logradouro ?? ""} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="campo">
          Número
          <input className="entrada" name="numero" maxLength={20} defaultValue={inicial?.numero ?? ""} placeholder="ou S/N" />
        </label>
        <label className="campo">
          Complemento
          <input className="entrada" name="complemento" maxLength={80} defaultValue={inicial?.complemento ?? ""} />
        </label>
      </div>
      {comReferencia && (
        <label className="campo">
          Ponto de referência
          <input className="entrada" name="referencia" maxLength={160} defaultValue={inicial?.referencia ?? ""} placeholder="Ex.: portão verde, ao lado da igreja" />
          <span className="text-xs font-normal text-tinta-suave">Ajuda muito o entregador em rua sem número.</span>
        </label>
      )}
    </>
  );
}
