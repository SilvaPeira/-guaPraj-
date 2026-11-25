import { startTransition, type FormEvent } from "react";

/**
 * Envia o formulário para a action SEM apagar o que foi digitado.
 *
 * Com `<form action={...}>`, o React 19 limpa todos os campos depois do envio — inclusive quando
 * a action volta com erro, e a pessoa perde o que preencheu (ex.: cadastro da loja recusado por
 * faltar o ponto no mapa). Use `<form onSubmit={enviarSemLimpar(enviar)}>`.
 * O botão clicado (name/value) vai junto, como no envio normal.
 * Formulários que devem esvaziar depois de salvar fazem isso explicitamente (reset ou key).
 */
export function enviarSemLimpar(acao: (dados: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const quem = (e.nativeEvent as SubmitEvent).submitter;
    const dados = new FormData(e.currentTarget, quem);
    startTransition(() => acao(dados));
  };
}
