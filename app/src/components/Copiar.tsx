"use client";

import { useState } from "react";

/** Botão de copiar (chave Pix, Pix copia e cola, link…). */
export default function Copiar({ texto, rotulo, classe = "botao-peq" }: { texto: string; rotulo: string; classe?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className={classe}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          /* sem permissão de área de transferência: o texto continua visível para copiar à mão */
        }
      }}
    >
      {copiado ? "✓ Copiado!" : rotulo}
    </button>
  );
}
