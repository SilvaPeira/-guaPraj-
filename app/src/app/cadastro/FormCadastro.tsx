"use client";

import { useActionState } from "react";
import Link from "next/link";
import CamposEndereco, { type EnderecoInicial } from "@/components/CamposEndereco";
import { salvarCadastro, type EstadoForm } from "./actions";

export default function FormCadastro({ nome, endereco, jaAceitou }: { nome: string; endereco: EnderecoInicial | null; jaAceitou: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(salvarCadastro, {});
  return (
    <form action={enviar} className="pilha">
      <div className="cartao pilha">
        <label className="campo">
          Seu nome
          <input className="entrada" name="nome" required maxLength={80} autoComplete="name" defaultValue={nome} />
        </label>
      </div>
      <div className="cartao pilha">
        <h2 className="titulo-secao">Endereço de entrega</h2>
        <CamposEndereco inicial={endereco} />
      </div>
      <label className="escolha items-start">
        <input type="checkbox" name="termos" defaultChecked={jaAceitou} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
        <span className="text-sm">
          Li e aceito os <Link href="/termos" className="font-semibold text-verde underline" target="_blank">termos de uso e a política de privacidade</Link>.
          Sua localização é usada só para a entrega.
        </span>
      </label>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar e continuar"}
      </button>
    </form>
  );
}
