"use client";

import { useState } from "react";

export default function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="botao-peq"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          /* sem permissão de área de transferência */
        }
      }}
    >
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}
