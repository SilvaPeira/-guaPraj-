"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import CamposEndereco, { type CidadeEndereco, type EnderecoInicial } from "@/components/CamposEndereco";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { salvarCadastro, type EstadoForm } from "./actions";
import { enviarSemLimpar } from "@/lib/formulario";

/** Cadastro novo: campos abertos. Cadastro existente: bloqueado até tocar em "Editar". */
export default function FormCadastro(p: { nome: string; endereco: EnderecoInicial | null; jaAceitou: boolean; cidades: CidadeEndereco[] }) {
  const [versao, setVersao] = useState(0);
  return <Interno key={versao} {...p} aoCancelar={() => setVersao((v) => v + 1)} />;
}

function Interno({
  nome,
  endereco,
  jaAceitou,
  cidades,
  aoCancelar,
}: {
  nome: string;
  endereco: EnderecoInicial | null;
  jaAceitou: boolean;
  cidades: CidadeEndereco[];
  aoCancelar: () => void;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(salvarCadastro, {});
  const novo = !endereco;
  const edicao = useEdicao(null, novo);
  const ed = { ...edicao, cancelar: aoCancelar };
  const editando = ed.editando;

  return (
    <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
      {!novo && !editando && <BotoesEdicao ed={ed} textoEditar="Editar meus dados" />}
      <fieldset disabled={!editando} className="pilha">
        <div className="cartao pilha">
          <label className="campo">
            Seu nome
            <input className="entrada" name="nome" required maxLength={80} autoComplete="name" defaultValue={nome} />
          </label>
        </div>
        <div className="cartao pilha relative">
          <h2 className="titulo-secao">Endereço de entrega</h2>
          <CamposEndereco inicial={endereco} cidades={cidades} />
          {/* Com o cadastro bloqueado, o mapa não pode ser arrastado. */}
          {!editando && <div className="absolute inset-0 z-[1100] cursor-default" aria-hidden="true" />}
        </div>
        {novo ? (
          <label className="escolha items-start">
            <input type="checkbox" name="termos" defaultChecked={jaAceitou} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
            <span className="text-sm">
              Li e aceito os{" "}
              <Link href="/termos" className="font-semibold text-verde underline" target="_blank">
                termos de uso e a política de privacidade
              </Link>
              . Sua localização é usada só para a entrega.
            </span>
          </label>
        ) : (
          <input type="hidden" name="termos" value="on" />
        )}
      </fieldset>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {novo ? (
        <button className="botao" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar e continuar"}
        </button>
      ) : (
        editando && <BotoesEdicao ed={ed} salvando={enviando} />
      )}
    </form>
  );
}
