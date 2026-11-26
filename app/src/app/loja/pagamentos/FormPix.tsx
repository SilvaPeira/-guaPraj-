"use client";

import { useActionState, useState } from "react";
import { enviarSemLimpar } from "@/lib/formulario";
import { TIPOS_PIX } from "@/lib/pix";
import { salvarPix, type EstadoPix } from "./pix-actions";

/** Chave Pix da loja (o cliente que escolhe Pix na entrega vê a chave e o "copia e cola" com o valor). */
export default function FormPix(p: { tipo: string | null; chaveLegivel: string | null; nome: string | null; nomeLoja: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoPix, FormData>(salvarPix, {});
  const [tipo, setTipo] = useState(p.tipo ?? "cnpj");
  const exemplo = TIPOS_PIX.find((t) => t.tipo === tipo)?.exemplo ?? "";
  return (
    <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
      <label className="campo">
        Tipo da chave
        <select className="entrada" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_PIX.map((t) => (
            <option key={t.tipo} value={t.tipo}>
              {t.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        Chave Pix
        <input className="entrada" name="chave" required defaultValue={p.tipo === tipo ? (p.chaveLegivel ?? "") : ""} placeholder={exemplo} autoComplete="off" />
      </label>
      <label className="campo">
        Nome de quem recebe
        <input className="entrada" name="nome" required maxLength={60} defaultValue={p.nome ?? p.nomeLoja} placeholder="Como aparece no banco" />
        <span className="text-xs font-normal text-tinta-suave">O cliente confere esse nome no app do banco antes de pagar.</span>
      </label>
      {estado.erro && (
        <p role="alert" className="aviso-erro text-sm">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="aviso-ok text-sm">
          {estado.ok}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="botao-peq" name="acao" value="salvar" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar chave Pix"}
        </button>
        {p.chaveLegivel && (
          <button className="botao-peq-sec" name="acao" value="remover" formNoValidate disabled={enviando}>
            Remover
          </button>
        )}
      </div>
    </form>
  );
}
