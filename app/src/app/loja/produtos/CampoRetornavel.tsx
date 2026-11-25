"use client";

import { useState } from "react";

/**
 * "Retornável": o cliente entrega o casco vazio e paga só o líquido.
 * Marcando, aparece o campo do preço do líquido.
 */
export default function CampoRetornavel({ inicialCentavos = null, travado = false }: { inicialCentavos?: number | null; travado?: boolean }) {
  const [marcado, setMarcado] = useState(inicialCentavos !== null);
  return (
    <div className="pilha rounded-xl bg-fundo p-3">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="retornavelBebida" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} disabled={travado} className="mt-0.5 h-5 w-5 accent-verde" />
        <span>
          <b className="block">Retornável</b>
          <span className="text-tinta-suave">O cliente entrega o casco vazio e paga só o líquido. Sem casco, paga o preço normal.</span>
        </span>
      </label>
      {marcado && (
        <label className="campo">
          Preço só do líquido (R$)
          <input
            className="entrada min-h-11"
            name="precoLiquido"
            inputMode="decimal"
            required
            disabled={travado}
            defaultValue={inicialCentavos !== null ? (inicialCentavos / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="Ex.: 7,50"
          />
        </label>
      )}
    </div>
  );
}
