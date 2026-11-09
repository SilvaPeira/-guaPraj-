import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { CATEGORIAS, ESTOQUE_BAIXO, ORDEM_GRUPOS, podeVender } from "@/lib/catalogo";
import FormNovoProduto from "./FormNovoProduto";
import { atualizarProduto } from "./actions";

export const metadata: Metadata = { title: "Catálogo" };

type Produto = typeof schema.produtos.$inferSelect;

export default async function Produtos() {
  const { loja, db } = await exigirLoja();
  const lista = await db
    .select()
    .from(schema.produtos)
    .where(eq(schema.produtos.lojaId, loja.id))
    .orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome));

  const grupos = ORDEM_GRUPOS.map((g) => ({ grupo: g, itens: lista.filter((p) => CATEGORIAS[p.categoria].grupo === g) })).filter((g) => g.itens.length);
  const baixos = lista.filter((p) => p.disponivel && p.estoque !== null && p.estoque <= ESTOQUE_BAIXO);

  return (
    <>
      <Topo titulo="Catálogo" subtitulo={loja.nome} />
      <main className="conteudo">
        <p className="text-sm text-tinta-suave">O cliente pode pedir estes itens junto com a água. Itens esgotados ou em falta não aparecem para ele.</p>
        {baixos.length > 0 && (
          <p role="status" className="aviso-erro text-sm">
            Estoque baixo: {baixos.map((p) => `${p.nome} (${p.estoque})`).join(", ")}
          </p>
        )}
        {grupos.map(({ grupo, itens }) => (
          <section key={grupo} className="cartao pilha">
            <h2 className="titulo-secao">{grupo}</h2>
            <ul className="divide-y divide-borda">
              {itens.map((p) => (
                <ItemProduto key={p.id} p={p} />
              ))}
            </ul>
          </section>
        ))}
        <FormNovoProduto vendeAlcool={loja.vendeAlcool} />
      </main>
    </>
  );
}

function ItemProduto({ p }: { p: Produto }) {
  const vende = podeVender(p);
  const reais = (p.precoCentavos / 100).toFixed(2).replace(".", ",");
  return (
    <li className={`flex flex-col gap-2 py-3 ${vende ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <b className="text-[15px]">{p.nome}</b>
          {p.marca && <p className="text-sm text-tinta-suave">{p.marca}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {p.alcoolico && <span className="selo selo-acai">18+</span>}
            {p.retornavel && <span className="selo selo-rio">troca de casco</span>}
            {!p.disponivel && <span className="selo selo-cinza">em falta</span>}
            {p.disponivel && p.estoque === 0 && <span className="selo selo-terra">esgotado</span>}
            {p.disponivel && p.estoque !== null && p.estoque > 0 && p.estoque <= ESTOQUE_BAIXO && <span className="selo selo-terra">estoque baixo</span>}
          </div>
        </div>
        <form action={atualizarProduto} className="flex-none">
          <input type="hidden" name="id" value={p.id} />
          <button name="acao" value="alternar" className={p.disponivel ? "botao-peq-sec" : "botao-peq"}>
            {p.disponivel ? "Marcar em falta" : "Tenho de novo"}
          </button>
        </form>
      </div>

      {p.estoque !== null && (
        <form action={atualizarProduto} className="flex items-center gap-2">
          <input type="hidden" name="id" value={p.id} />
          <span className="text-sm text-tinta-suave">Em estoque:</span>
          <button name="acao" value="tirar" className="botao-peq-sec w-11 px-0" aria-label={`Tirar 1 de ${p.nome}`} disabled={p.estoque === 0}>
            −
          </button>
          <b className="w-10 text-center font-titulo text-lg tabular-nums" aria-live="polite">
            {p.estoque}
          </b>
          <button name="acao" value="somar" className="botao-peq-sec w-11 px-0" aria-label={`Somar 1 em ${p.nome}`}>
            +
          </button>
        </form>
      )}

      <details className="group">
        <summary className="link-texto cursor-pointer list-none">Editar marca, preço e estoque</summary>
        <form action={atualizarProduto} className="mt-2 grid grid-cols-2 gap-2">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="acao" value="salvar" />
          <label className="campo col-span-2">
            Marca
            <input className="entrada min-h-11" name="marca" maxLength={60} defaultValue={p.marca ?? ""} />
          </label>
          <label className="campo">
            Preço (R$)
            <input className="entrada min-h-11" name="preco" inputMode="decimal" defaultValue={reais} />
          </label>
          <label className="campo">
            Estoque
            <input className="entrada min-h-11" name="estoque" inputMode="numeric" defaultValue={p.estoque ?? ""} placeholder="não controla" />
          </label>
          <button className="botao-peq col-span-2">Salvar</button>
        </form>
      </details>
      <p className="text-sm">
        <b>{(p.precoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b>
        {p.estoque === null && <span className="text-tinta-suave"> · estoque não controlado</span>}
      </p>
    </li>
  );
}
