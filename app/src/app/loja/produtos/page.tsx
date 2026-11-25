import type { Metadata } from "next";
import { and, asc, eq, isNull } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { ESTOQUE_BAIXO, podeSerRetornavel, podeVender } from "@/lib/catalogo";
import { agruparPorCategoria, categoriaDo, mapaCategorias, type MapaCategorias } from "@/lib/categorias";
import FormNovoProduto from "./FormNovoProduto";
import Link from "next/link";
import { recursosDaLoja } from "@/lib/planos-app";
import { acaoRapidaProduto } from "./actions";
import ProdutoEditavel from "./ProdutoEditavel";
import FotoProduto, { urlFoto } from "@/components/FotoProduto";

export const metadata: Metadata = { title: "Catálogo" };

type Produto = typeof schema.produtos.$inferSelect;

export default async function Produtos() {
  const { loja, db } = await exigirLoja();
  const { produtosExtras } = await recursosDaLoja(loja.id);
  const lista = await db
    .select()
    .from(schema.produtos)
    .where(and(eq(schema.produtos.lojaId, loja.id), isNull(schema.produtos.excluidoEm)))
    .orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome));

  const mapa = await mapaCategorias();
  const grupos = agruparPorCategoria(lista, mapa).map((g) => ({ grupo: g.nome, itens: g.itens }));
  // Para escolher num produto novo: as ativas. Para trocar num existente: as ativas que não são do sistema.
  const ativas = mapa.lista.filter((c) => c.ativa);
  const opcoesNovo = ativas.map(({ id, nome, tipo }) => ({ id, nome, tipo }));
  const baixos = lista.filter((p) => p.disponivel && p.estoque !== null && p.estoque <= ESTOQUE_BAIXO);

  return (
    <>
      <Topo titulo="Catálogo" subtitulo={loja.nome} />
      <main className="conteudo">
        {!produtosExtras && (
          <p className="aviso-info text-sm">
            Seu plano atual vende só água. Bebidas, gelo e polpas ficam salvos aqui, mas os clientes não veem.{" "}
            <Link href="/loja/plano" className="link-texto">
              Ver planos
            </Link>
          </p>
        )}
        <p className="text-sm text-tinta-suave">
          O cliente pode pedir estes itens junto com a água. Itens esgotados ou em falta não aparecem para ele. Para pôr foto, mudar o nome ou excluir, toque em <b>Editar</b>.
        </p>
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
                <ItemProduto key={p.id} p={p} mapa={mapa} vendeAlcool={loja.vendeAlcool} />
              ))}
            </ul>
          </section>
        ))}
        <FormNovoProduto vendeAlcool={loja.vendeAlcool} categorias={opcoesNovo} />
      </main>
    </>
  );
}

function ItemProduto({ p, mapa, vendeAlcool }: { p: Produto; mapa: MapaCategorias; vendeAlcool: boolean }) {
  const fixa = p.categoria === "agua_galao" || p.categoria === "casco";
  const trocaveis = fixa
    ? []
    : mapa.lista.filter((c) => c.ativa && !c.sistema && (vendeAlcool || c.tipo !== "alcoolica")).map(({ id, nome, tipo }) => ({ id, nome, tipo }));
  const vende = podeVender(p);
  return (
    <li className={`flex flex-col gap-2 py-3 ${vende ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <FotoProduto url={urlFoto(p)} categoria={p.categoria} nome={p.nome} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <b className="text-[15px]">{p.nome}</b>
          {p.marca && <p className="text-sm text-tinta-suave">{p.marca}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {p.alcoolico && <span className="selo selo-acai">18+</span>}
            {p.retornavel && <span className="selo selo-rio">troca de casco</span>}
            {p.precoLiquidoCentavos !== null && (
              <span className="selo selo-rio">retornável · líquido {(p.precoLiquidoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            )}
            {!p.disponivel && <span className="selo selo-cinza">em falta</span>}
            {p.disponivel && p.estoque === 0 && <span className="selo selo-terra">esgotado</span>}
            {p.disponivel && p.estoque !== null && p.estoque > 0 && p.estoque <= ESTOQUE_BAIXO && <span className="selo selo-terra">estoque baixo</span>}
          </div>
        </div>
        <form action={acaoRapidaProduto} className="flex-none">
          <input type="hidden" name="id" value={p.id} />
          <button name="acao" value="alternar" className={p.disponivel ? "botao-peq-sec" : "botao-peq"}>
            {p.disponivel ? "Marcar em falta" : "Tenho de novo"}
          </button>
        </form>
      </div>

      {p.estoque !== null && (
        <form action={acaoRapidaProduto} className="flex items-center gap-2">
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

      <ProdutoEditavel
        id={p.id}
        nome={p.nome}
        categoriaId={categoriaDo(p, mapa).id}
        categorias={trocaveis}
        fotoUrl={urlFoto(p)}
        marca={p.marca}
        precoCentavos={p.precoCentavos}
        estoque={p.estoque}
        precoLiquidoCentavos={p.precoLiquidoCentavos}
        podeRetornavel={podeSerRetornavel(p.categoria)}
      />
      {p.estoque === null && <p className="text-xs text-tinta-suave">Estoque não controlado</p>}
    </li>
  );
}
