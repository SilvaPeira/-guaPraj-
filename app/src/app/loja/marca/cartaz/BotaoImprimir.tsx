"use client";

/** Abre a impressão do navegador (o cartaz já esconde botões e menu ao imprimir). */
export default function BotaoImprimir() {
  return (
    <button type="button" className="botao-peq" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
