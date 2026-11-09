"use client";

import { useActionState } from "react";
import Link from "next/link";
import CamposEndereco from "@/components/CamposEndereco";
import { cadastrarLoja, type EstadoForm } from "./actions";

const DIAS = [
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sáb"],
  [0, "Dom"],
] as const;

export default function FormLoja() {
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(cadastrarLoja, {});
  return (
    <form action={enviar} className="pilha">
      <section className="cartao pilha">
        <h2 className="titulo-secao">Dados da loja</h2>
        <label className="campo">
          Nome da loja
          <input className="entrada" name="nome" required maxLength={80} placeholder="Ex.: Distribuidora Serra Sul" />
        </label>
        <label className="campo">
          CNPJ ou MEI
          <input className="entrada" name="documento" required inputMode="numeric" maxLength={20} />
        </label>
        <label className="campo">
          WhatsApp da loja
          <input className="entrada" name="telefone" required inputMode="tel" placeholder="(94) 9 9999-9999" />
        </label>
        <label className="campo">
          Marcas de água que vende
          <input className="entrada" name="marcasAgua" maxLength={120} placeholder="Ex.: Cristal, Fonte Viva" />
        </label>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Endereço da loja</h2>
        <CamposEndereco comReferencia={false} />
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Como você atende</h2>
        <label className="escolha items-center">
          <input type="checkbox" name="fazEntrega" defaultChecked className="h-5 w-5 shrink-0 accent-verde" />
          Faço entrega
        </label>
        <label className="escolha items-center">
          <input type="checkbox" name="fazRetirada" defaultChecked className="h-5 w-5 shrink-0 accent-verde" />
          Cliente pode retirar no balcão
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Entrego até (km)
            <input className="entrada" name="raioKm" inputMode="decimal" defaultValue="5" required />
          </label>
          <label className="campo">
            Taxa de entrega (R$)
            <input className="entrada" name="taxaEntrega" inputMode="decimal" defaultValue="0" required />
          </label>
        </div>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Preços</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Galão 20 L avulso (R$)
            <input className="entrada" name="precoGalao" inputMode="decimal" placeholder="15,00" required />
          </label>
          <label className="campo">
            Casco vazio (R$)
            <input className="entrada" name="precoCasco" inputMode="decimal" placeholder="25,00" required />
          </label>
        </div>
        <p className="text-sm text-tinta-suave">
          Criamos os planos de 8 a 32 galões/mês com 10% de desconto. Você ajusta os preços e cadastra bebidas no painel.
        </p>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Funcionamento</h2>
        <div className="flex flex-wrap gap-2">
          {DIAS.map(([v, t]) => (
            <label key={v} className="chip">
              <input type="checkbox" name="dias" value={v} defaultChecked={v !== 0} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Abre
            <input className="entrada" type="time" name="abre" defaultValue="07:00" required />
          </label>
          <label className="campo">
            Fecha
            <input className="entrada" type="time" name="fecha" defaultValue="19:00" required />
          </label>
        </div>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Regularização</h2>
        <label className="escolha items-start">
          <input type="checkbox" name="seloFiscal" className="mt-1 h-5 w-5 shrink-0 accent-verde" />
          <span className="text-sm">
            A água que vendo tem o <b>Selo Fiscal de Controle e Qualidade do Pará</b> (Lei 9.084/2020) e vasilhames dentro da validade.
          </span>
        </label>
        <label className="escolha items-start">
          <input type="checkbox" name="vendeAlcool" className="mt-1 h-5 w-5 shrink-0 accent-verde" />
          <span className="text-sm">
            Vendo <b>bebidas alcoólicas</b>, tenho alvará para isso e o entregador vai conferir documento com foto. Proibida a venda a menores de 18 anos.
          </span>
        </label>
        <label className="escolha items-start">
          <input type="checkbox" name="termos" className="mt-1 h-5 w-5 shrink-0 accent-verde" />
          <span className="text-sm">
            Aceito os <Link href="/termos" target="_blank" className="font-semibold text-verde underline">termos de uso</Link>. A loja é responsável pela venda, nota fiscal e entrega.
          </span>
        </label>
      </section>

      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar cadastro para análise"}
      </button>
    </form>
  );
}
