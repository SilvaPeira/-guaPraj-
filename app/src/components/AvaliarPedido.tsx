"use client";

import { useActionState, useState } from "react";
import { avaliar, type EstadoAvaliacao } from "@/app/(cliente)/pedidos/[id]/actions";

const ROTULOS = ["", "Ruim", "Fraco", "Ok", "Bom", "Ótimo"];

export default function AvaliarPedido({ pedidoId }: { pedidoId: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoAvaliacao, FormData>(avaliar, {});
  const [nota, setNota] = useState(0);
  if (estado.ok) return <p className="aviso-ok">Obrigado pela avaliação! ⭐</p>;
  return (
    <form action={enviar} className="cartao pilha">
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="nota" value={nota} />
      <b className="titulo-secao">Como foi a entrega?</b>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => setNota(n)}
            className="flex h-11 w-11 items-center justify-center text-3xl leading-none"
            style={{ color: n <= nota ? "#f2a65a" : "var(--color-borda2)" }}
          >
            ★
          </button>
        ))}
        {nota > 0 && <span className="ml-2 text-sm font-semibold">{ROTULOS[nota]}</span>}
      </div>
      {nota > 0 && (
        <label className="campo">
          Quer contar mais? (opcional)
          <textarea className="entrada min-h-20 py-2" name="comentario" maxLength={300} placeholder="Ex.: entregador educado, chegou no horário." />
        </label>
      )}
      {estado.erro && <p role="alert" className="aviso-erro text-sm">{estado.erro}</p>}
      <button className="botao" disabled={enviando || nota === 0}>
        Enviar avaliação
      </button>
    </form>
  );
}
