import type { Metadata } from "next";
import { count, isNotNull, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Topo } from "@/components/ui";
import { listarCategorias, TIPOS_EDITAVEIS } from "@/lib/categorias";
import { CATEGORIAS } from "@/lib/catalogo";
import { acaoCategoria } from "./actions";
import FormCategoria from "./FormCategoria";

export const metadata: Metadata = { title: "Categorias do catálogo" };

export default async function Categorias() {
  const db = await getDb();
  const [lista, uso] = await Promise.all([
    listarCategorias(true),
    db
      .select({ categoriaId: schema.produtos.categoriaId, n: count() })
      .from(schema.produtos)
      .where(isNull(schema.produtos.excluidoEm))
      .groupBy(schema.produtos.categoriaId)
      .having(isNotNull(schema.produtos.categoriaId)),
  ]);
  const nProdutos = new Map(uso.map((u) => [u.categoriaId, u.n]));
  const regras = new Map(TIPOS_EDITAVEIS.map((t) => [t.tipo as string, t.regras]));

  return (
    <>
      <Topo titulo="Categorias do catálogo" subtitulo="Como os produtos aparecem para o cliente" voltar="/admin/ajustes" />
      <main className="conteudo">
        <p className="text-sm text-tinta-suave">
          As lojas escolhem a categoria ao cadastrar o produto, e o cliente vê os produtos separados por elas, nesta ordem. O <b>tipo</b> de cada categoria define as
          regras (18+, retornável, plano da loja) e não muda depois de criada. Desativar esconde a categoria para produtos novos; quem já tem produto nela continua.
        </p>

        {lista.map((c) => {
          const n = nProdutos.get(c.id) ?? 0;
          return (
            <article key={c.id} className={`cartao pilha ${c.ativa ? "" : "opacity-70"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <b className="font-titulo text-lg">
                  <span className="mr-1.5 text-sm text-tinta-suave">{c.ordem}.</span>
                  {c.nome}
                </b>
                <span className="flex-none text-sm">
                  {n} produto(s)
                  {!c.ativa && <span className="selo selo-cinza ml-1">Desativada</span>}
                  {c.sistema && <span className="selo selo-rio ml-1">Sistema</span>}
                </span>
              </div>
              <p className="text-xs text-tinta-suave">
                Tipo: {CATEGORIAS[c.tipo].nome}
                {regras.get(c.tipo) ? ` · ${regras.get(c.tipo)}` : c.sistema ? " · usado nos planos e na troca de casco" : ""}
              </p>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">Editar nome e ordem</summary>
                <div className="mt-3">
                  <FormCategoria c={c} tipos={TIPOS_EDITAVEIS} />
                </div>
              </details>
              {!c.sistema && (
                <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
                  <form action={acaoCategoria}>
                    <input type="hidden" name="id" value={c.id} />
                    <button name="acao" value="alternar" className={c.ativa ? "botao-peq-sec" : "botao-peq"}>
                      {c.ativa ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  {n === 0 && (
                    <form action={acaoCategoria}>
                      <input type="hidden" name="id" value={c.id} />
                      <button name="acao" value="excluir" className="botao-peq-perigo">
                        Excluir
                      </button>
                    </form>
                  )}
                </div>
              )}
            </article>
          );
        })}

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">+ Nova categoria</summary>
          <div className="mt-3">
            <FormCategoria key={lista.length} c={{ nome: "", tipo: "", ordem: lista.length }} tipos={TIPOS_EDITAVEIS} />
          </div>
        </details>
      </main>
    </>
  );
}
