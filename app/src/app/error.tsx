"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Erro inesperado numa tela: mensagem simples, botão para tentar de novo, e o erro vai para o registro. */
export default function ErroNaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[tela]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-titulo text-2xl font-bold">Algo deu errado</h1>
      <p className="text-tinta-suave">Não conseguimos abrir esta tela agora. Tente de novo; se continuar, fale com o suporte.</p>
      {error.digest && <p className="text-xs text-tinta-suave">Código do erro: {error.digest}</p>}
      <div className="flex gap-2">
        <button type="button" className="botao" onClick={reset}>
          Tentar de novo
        </button>
        <Link href="/" className="botao-sec">
          Início
        </Link>
      </div>
    </main>
  );
}
