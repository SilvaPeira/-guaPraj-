"use client";

import { useActionState, useState } from "react";
import { entrar, type EstadoLogin } from "./actions";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { enviarSemLimpar } from "@/lib/formulario";

type Props = { intencao: string | null; suporte: string | null };

export default function FormEntrar({ intencao, suporte }: Props) {
  const [e, enviar, enviando] = useActionState<EstadoLogin, FormData>(entrar, { etapa: "telefone" });
  const [ver, setVer] = useState(false);
  const trocar = intencao ? `/entrar?para=${intencao}` : "/entrar";

  const ocultos = (passo: string) => (
    <>
      <input type="hidden" name="passo" value={passo} />
      <input type="hidden" name="intencao" value={intencao ?? ""} />
      {e.telefone && <input type="hidden" name="telefone" value={e.telefone} />}
    </>
  );
  const erro = e.erro && (
    <p role="alert" className="aviso-erro">
      {e.erro}
    </p>
  );
  const cabecalho = e.telefone && (
    <p className="flex items-center justify-between gap-2 text-base">
      <b>{formatarTelefone(e.telefone)}</b>
      <a href={trocar} className="link-texto text-sm">
        Trocar número
      </a>
    </p>
  );
  const campoSenha = (nome: string, rotulo: string, novo: boolean, foco = false) => (
    <label className="campo">
      {rotulo}
      <input
        className="entrada"
        name={nome}
        type={ver ? "text" : "password"}
        autoComplete={novo ? "new-password" : "current-password"}
        minLength={novo ? 6 : undefined}
        required
        autoFocus={foco}
      />
    </label>
  );
  const mostrar = (
    <label className="flex items-center gap-2 text-sm text-tinta-suave">
      <input type="checkbox" checked={ver} onChange={(x) => setVer(x.target.checked)} className="h-4 w-4 accent-verde" />
      Mostrar senha
    </label>
  );

  if (e.etapa === "telefone" || !e.telefone) {
    return (
      <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
        {ocultos("telefone")}
        <label className="campo">
          Seu celular
          <input className="entrada" name="telefone" inputMode="tel" autoComplete="tel" placeholder="(94) 9 9999-9999" required autoFocus />
        </label>
        {erro}
        <button className="botao" disabled={enviando}>
          {enviando ? "Um instante…" : "Continuar"}
        </button>
        <p className="texto-pequeno text-tinta-suave">Primeira vez? No próximo passo você cria a sua senha.</p>
      </form>
    );
  }

  if (e.etapa === "criar") {
    return (
      <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
        {ocultos("criar")}
        {cabecalho}
        <p className="text-sm text-tinta-suave">Este celular ainda não tem conta. Crie uma senha para entrar das próximas vezes.</p>
        {campoSenha("senha", "Crie uma senha (mínimo 6)", true, true)}
        {campoSenha("confirmacao", "Repita a senha", true)}
        {mostrar}
        {erro}
        <button className="botao" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta e entrar"}
        </button>
      </form>
    );
  }

  if (e.etapa === "codigo") {
    return (
      <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
        {ocultos("codigo")}
        {cabecalho}
        <p className="text-sm">Enviamos um código de 6 números para o seu WhatsApp. Digite o código e crie uma senha nova.</p>
        {e.codigoDev && (
          <p className="aviso-info">
            Modo de teste: o código é <b className="tabular-nums">{e.codigoDev}</b>
          </p>
        )}
        <label className="campo">
          Código
          <input className="entrada text-center text-2xl tracking-[.4em] tabular-nums" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
        </label>
        {campoSenha("senha", "Senha nova (mínimo 6)", true)}
        {campoSenha("confirmacao", "Repita a senha nova", true)}
        {mostrar}
        {erro}
        <button className="botao" disabled={enviando}>
          {enviando ? "Entrando…" : "Salvar senha e entrar"}
        </button>
      </form>
    );
  }

  // etapa "senha"
  return (
    <div className="pilha">
      <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
        {ocultos("senha")}
        {cabecalho}
        {campoSenha("senha", "Senha", false, true)}
        {mostrar}
        {erro}
        <button className="botao" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {e.podeCodigo ? (
        <form onSubmit={enviarSemLimpar(enviar)}>
          {ocultos("esqueci")}
          <button className="link-texto" disabled={enviando}>
            Esqueci a senha (receber código no WhatsApp)
          </button>
        </form>
      ) : (
        <p className="text-sm text-tinta-suave">
          Esqueceu a senha?{" "}
          {suporte ? (
            <a
              className="link-texto"
              href={linkWhatsApp(suporte, `Olá! Esqueci a senha do ÁguaPrajá. Meu celular é ${formatarTelefone(e.telefone)}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Fale com o suporte
            </a>
          ) : (
            "Fale com o suporte"
          )}{" "}
          e receba um link para criar uma nova.
        </p>
      )}
    </div>
  );
}
