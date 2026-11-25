import type { Metadata } from "next";
import { count } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Topo, Vazio } from "@/components/ui";
import { listarCidades } from "@/lib/cidades";
import { acaoCidade } from "./actions";
import FormCidade from "./FormCidade";

export const metadata: Metadata = { title: "Cidades atendidas" };

export default async function Cidades() {
  const db = await getDb();
  const [cidades, lojas, clientes] = await Promise.all([
    listarCidades(true),
    db.select({ cidade: schema.lojas.cidade, n: count() }).from(schema.lojas).groupBy(schema.lojas.cidade),
    db.select({ cidade: schema.enderecos.cidade, n: count() }).from(schema.enderecos).groupBy(schema.enderecos.cidade),
  ]);
  const nLojas = new Map(lojas.map((l) => [l.cidade, l.n]));
  const nEnd = new Map(clientes.map((c) => [c.cidade, c.n]));
  // Cadastros antigos em cidades que não estão na lista (ex.: antes de a lista existir).
  const foraDaLista = [...new Set([...nLojas.keys(), ...nEnd.keys()])].filter((n) => !cidades.some((c) => c.nome === n));

  return (
    <>
      <Topo titulo="Cidades atendidas" subtitulo="Onde clientes e distribuidoras podem se cadastrar" voltar="/admin" />
      <main className="conteudo">
        <p className="text-sm text-tinta-suave">
          Só as cidades <b>ativas</b> aparecem no cadastro do cliente e da distribuidora, e no site. Desativar não apaga ninguém: quem já está cadastrado continua
          funcionando, mas não entram novos.
        </p>

        {cidades.length === 0 && <Vazio>Nenhuma cidade cadastrada: ninguém consegue se cadastrar. Adicione a primeira abaixo.</Vazio>}

        {cidades.map((c) => {
          const l = nLojas.get(c.nome) ?? 0;
          const e = nEnd.get(c.nome) ?? 0;
          return (
            <article key={c.id} className={`cartao pilha ${c.ativa ? "" : "opacity-70"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <b className="font-titulo text-xl">
                  {c.nome} – {c.uf}
                </b>
                <span className="text-sm">
                  {l} loja(s) · {e} endereço(s)
                  {!c.ativa && <span className="selo selo-cinza ml-1">Desativada</span>}
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">Editar nome, estado e centro do mapa</summary>
                <div className="mt-3">
                  <FormCidade c={c} />
                </div>
              </details>
              <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
                <form action={acaoCidade}>
                  <input type="hidden" name="id" value={c.id} />
                  <button name="acao" value="alternar" className={c.ativa ? "botao-peq-sec" : "botao-peq"}>
                    {c.ativa ? "Desativar" : "Ativar"}
                  </button>
                </form>
                {l === 0 && e === 0 && (
                  <form action={acaoCidade}>
                    <input type="hidden" name="id" value={c.id} />
                    <button name="acao" value="excluir" className="botao-peq-perigo">
                      Excluir
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}

        {foraDaLista.length > 0 && (
          <p className="aviso-info text-sm">
            Há cadastros em cidades fora da lista: {foraDaLista.map((n) => `${n} (${nLojas.get(n) ?? 0} loja(s), ${nEnd.get(n) ?? 0} endereço(s))`).join(", ")}. Adicione a
            cidade com o mesmo nome para eles aparecerem aqui, ou peça para mudarem o endereço.
          </p>
        )}

        <details className="cartao" open={cidades.length === 0}>
          <summary className="cursor-pointer font-semibold">+ Nova cidade</summary>
          <div className="mt-3">
            <FormCidade key={cidades.length} c={{ nome: "", uf: "PA", lat: null, lng: null, ordem: cidades.length }} />
          </div>
        </details>
      </main>
    </>
  );
}
