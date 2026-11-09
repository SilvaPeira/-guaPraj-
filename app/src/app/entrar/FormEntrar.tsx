"use client";

import { useActionState } from "react";
import { confirmarCodigo, pedirCodigo, type EstadoLogin } from "./actions";
import { formatarTelefone } from "@/lib/telefone";

export default function FormEntrar({ intencao }: { intencao: string | null }) {
  const [estadoTel, enviarTel, enviandoTel] = useActionState<EstadoLogin, FormData>(pedirCodigo, { etapa: "telefone" });
  const [estadoCod, enviarCod, enviandoCod] = useActionState<EstadoLogin, FormData>(confirmarCodigo, { etapa: "codigo" });

  const naEtapaCodigo = estadoTel.etapa === "codigo" && estadoTel.telefone;

  if (!naEtapaCodigo) {
    return (
      <form action={enviarTel} className="pilha">
        <label className="campo">
          Seu celular (WhatsApp)
          <input
            className="entrada"
            name="telefone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(94) 9 9999-9999"
            defaultValue=""
            required
            autoFocus
          />
        </label>
        {estadoTel.erro && <p role="alert" className="aviso-erro">{estadoTel.erro}</p>}
        <button className="botao" disabled={enviandoTel}>
          {enviandoTel ? "Enviando…" : "Receber código no WhatsApp"}
        </button>
        <p className="texto-pequeno text-tinta-suave">Sem senha: enviamos um código de 6 números para o seu WhatsApp.</p>
      </form>
    );
  }

  return (
    <form action={enviarCod} className="pilha">
      <input type="hidden" name="telefone" value={estadoTel.telefone} />
      <input type="hidden" name="intencao" value={intencao ?? ""} />
      <p className="text-base">
        Enviamos um código para <b>{formatarTelefone(estadoTel.telefone!)}</b>.
      </p>
      {estadoTel.codigoDev && (
        <p className="aviso-info">
          Modo de teste: o código é <b className="tabular-nums">{estadoTel.codigoDev}</b>
        </p>
      )}
      <label className="campo">
        Código
        <input
          className="entrada text-center text-2xl tracking-[.4em] tabular-nums"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
        />
      </label>
      {estadoCod.erro && <p role="alert" className="aviso-erro">{estadoCod.erro}</p>}
      <button className="botao" disabled={enviandoCod}>
        {enviandoCod ? "Entrando…" : "Entrar"}
      </button>
      <a href={intencao ? `/entrar?para=${intencao}` : "/entrar"} className="link-texto">
        Trocar número ou pedir outro código
      </a>
    </form>
  );
}
