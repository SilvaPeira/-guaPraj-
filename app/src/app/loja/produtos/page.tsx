import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { CATEGORIAS, ORDEM_GRUPOS } from "@/lib/catalogo";
import { formatarReais } from "@/lib/validacao";
import FormNovoProduto from "./FormNovoProduto";
import { atualizarProduto } from "./actions";

export const metadata: Metadata = { title: "Catálogo" };

export default async function Produtos() {
  const { loja, db } = await exigirLoja();
  const lista = await db
    .select()
    .from(schema.produtos)
    .where(eq(schema.produtos.lojaId, loja.id))
    .orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome));

  const grupos = ORDEM_GRUPOS.map((g) => ({ grupo: g, itens: lista.filter((p) => CATEGORIAS[p.categoria].grupo === g) })).filter((g) => g.itens.length);

  return (
    <>
      <Topo titulo="Catálogo" subtitulo={loja.nome} />
      <main className="conteudo">
        <p className="text-sm text-tinta-suave">
          O cliente pode pedir estes itens junto com a água. Desligue o que estiver em falta.
        </p>
        {grupos.map(({ grupo, itens }) => (
          <section key={grupo} className="cartao pilha">
            <h2 className="titulo-secao">{grupo}</h2>
            <ul className="divide-y divide-borda">
              {itens.map((p) => (
                <li key={p.id} className={`flex flex-col gap-2 py-3 ${p.disponivel ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b className="text-[15px]">{p.nome}</b>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.alcoolico && <span className="selo selo-acai">18+</span>}
                        {p.retornavel && <span className="selo selo-rio">troca de casco</span>}
                        {!p.disponivel && <span className="selo selo-cinza">em falta</span>}
                      </div>
                    </div>
                    <form action={atualizarProduto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button name="acao" value="alternar" className={p.disponivel ? "botao-peq-sec" : "botao-peq"}>
                        {p.disponivel ? "Marcar em falta" : "Tenho de novo"}
                      </button>
                    </form>
                  </div>
                  <form action={atualizarProduto} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="acao" value="preco" />
                    <label className="flex flex-1 items-center gap-2 text-sm text-tinta-suave">
                      Preço
                      <input
                        className="entrada min-h-11 w-28"
                        name="preco"
                        inputMode="decimal"
                        defaultValue={(p.precoCentavos / 100).toFixed(2).replace(".", ",")}
                        aria-label={`Preço de ${p.nome}`}
                      />
                    </label>
                    <span className="text-sm text-tinta-suave">{formatarReais(p.precoCentavos)}</span>
                    <button className="botao-peq-sec">Salvar</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <FormNovoProduto vendeAlcool={loja.vendeAlcool} />
      </main>
    </>
  );
}
