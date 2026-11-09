"use client";

import { useActionState } from "react";
import { cancelar, trocarPlano, type EstadoSimples } from "./actions";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FormTrocarPlano({
  assinaturaId,
  planoAtualId,
  planoProximoId,
  planos,
  aPartirDe,
}: {
  assinaturaId: string;
  planoAtualId: string;
  planoProximoId: string | null;
  planos: { id: string; galoesMes: number; precoCentavos: number }[];
  aPartirDe: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoSimples, FormData>(trocarPlano, {});
  return (
    <form action={enviar} className="pilha">
      <input type="hidden" name="assinaturaId" value={assinaturaId} />
      <p className="text-sm text-tinta-suave">O novo plano começa no próximo mês ({aPartirDe}). Até lá, segue o plano atual.</p>
      <div className="pilha">
        {planos.map((p) => (
          <label key={p.id} className="escolha items-center justify-between">
            <span className="flex items-center gap-3">
              <input type="radio" name="planoId" value={p.id} defaultChecked={(planoProximoId ?? planoAtualId) === p.id} className="h-5 w-5 accent-verde" />
              <span>
                <b>{p.galoesMes} {p.galoesMes === 1 ? "galão" : "galões"}/mês</b>
                {p.id === planoAtualId && <span className="selo selo-cinza ml-2">atual</span>}
              </span>
            </span>
            <b>{brl(p.precoCentavos)}</b>
          </label>
        ))}
      </div>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao-sec" disabled={enviando}>
        Salvar troca de plano
      </button>
    </form>
  );
}

export function FormCancelar({ assinaturaId, validaAte }: { assinaturaId: string; validaAte: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoSimples, FormData>(cancelar, {});
  return (
    <form action={enviar} className="pilha">
      <input type="hidden" name="assinaturaId" value={assinaturaId} />
      <p className="text-sm">
        Sem multa. As entregas continuam até <b>{validaAte}</b> (fim do mês já pago) e depois param.
      </p>
      <label className="escolha items-start">
        <input type="checkbox" name="confirmo" className="mt-1 h-5 w-5 shrink-0 accent-verde" />
        <span className="text-sm">Quero cancelar meu plano.</span>
      </label>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao-peq-perigo w-full" disabled={enviando}>
        Cancelar plano
      </button>
    </form>
  );
}
