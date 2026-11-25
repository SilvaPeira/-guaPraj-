"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

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

export type CidadeEndereco = { nome: string; uf: string; lat: number; lng: number };

/** Campos de endereço + mapa. Usado pelo cliente e pela loja. As cidades vêm do painel admin. */
export default function CamposEndereco({
  inicial,
  comReferencia = true,
  cidades,
}: {
  inicial?: EnderecoInicial | null;
  comReferencia?: boolean;
  cidades: CidadeEndereco[];
}) {
  const pos = inicial?.lat != null && inicial?.lng != null ? { lat: inicial.lat, lng: inicial.lng } : null;
  const atendida = cidades.find((c) => c.nome === inicial?.cidade);
  const [nomeCidade, setNomeCidade] = useState(atendida?.nome ?? cidades[0]?.nome ?? "");
  const cidade = cidades.find((c) => c.nome === nomeCidade);
  return (
    <>
      <label className="campo">
        Cidade
        <select className="entrada" name="cidade" value={nomeCidade} onChange={(e) => setNomeCidade(e.target.value)} required>
          {!cidades.length && <option value="">Nenhuma cidade atendida ainda</option>}
          {cidades.map((c) => (
            <option key={c.nome} value={c.nome}>
              {c.nome} – {c.uf}
            </option>
          ))}
        </select>
        {inicial?.cidade && !atendida && (
          <span className="text-xs font-normal text-terra-esc">Ainda não atendemos {inicial.cidade}. Escolha uma das cidades da lista.</span>
        )}
      </label>
      <div className="campo">
        Onde fica? Marque no mapa
        {/* Trocar a cidade reabre o mapa no centro dela, sem ponto marcado. */}
        <MapaPin key={nomeCidade} inicial={nomeCidade === inicial?.cidade ? pos : null} cidade={cidade?.nome} uf={cidade?.uf} centro={cidade ? { lat: cidade.lat, lng: cidade.lng } : undefined} />
      </div>
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
