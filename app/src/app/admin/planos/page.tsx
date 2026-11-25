import type { Metadata } from "next";
import { count, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Topo, Vazio } from "@/components/ui";
import { listarPlanosApp } from "@/lib/planos-app";
import { formatarReais } from "@/lib/validacao";
import { acaoPlanoApp } from "../actions";
import FormPlanoApp from "./FormPlanoApp";

export const metadata: Metadata = { title: "Planos do app" };

export default async function PlanosApp() {
  const db = await getDb();
  const [planos, uso] = await Promise.all([
    listarPlanosApp(),
    db.select({ planoId: schema.lojas.planoAppId, n: count() }).from(schema.lojas).where(isNotNull(schema.lojas.planoAppId)).groupBy(schema.lojas.planoAppId),
  ]);
  const lojasNoPlano = new Map(uso.map((u) => [u.planoId, u.n]));

  return (
    <>
      <Topo titulo="Planos para as distribuidoras" subtitulo="O que cada loja paga para usar o ÁguaPrajá" voltar="/admin" />
      <main className="conteudo">
        <p className="text-sm text-tinta-suave">
          As lojas escolhem o plano em <b>Ajustes → Meu plano</b>. Plano pago passa a valer quando você registra o pagamento em <b>Lojas</b>. Sem plano pago em dia, a loja
          fica com as regras do plano grátis. Limite vazio = ilimitado.
        </p>

        {planos.length === 0 && (
          <div className="cartao pilha">
            <Vazio>Nenhum plano cadastrado: hoje todas as lojas usam tudo sem limite.</Vazio>
            <form action={acaoPlanoApp}>
              <button name="acao" value="sugeridos" className="botao w-full">
                Criar os 3 planos do documento (Grátis, Essencial R$ 99, Completo R$ 199)
              </button>
            </form>
          </div>
        )}

        {planos.map((p) => {
          const n = lojasNoPlano.get(p.id) ?? 0;
          return (
            <article key={p.id} className={`cartao pilha ${p.ativo ? "" : "opacity-70"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <b className="font-titulo text-xl">{p.nome}</b>
                <span className="text-sm">
                  {p.precoCentavos ? `${formatarReais(p.precoCentavos)}/mês` : "Grátis"} · {n} loja(s)
                  {!p.ativo && <span className="selo selo-cinza ml-1">Fora de venda</span>}
                </span>
              </div>
              <FormPlanoApp p={p} />
              <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
                <form action={acaoPlanoApp}>
                  <input type="hidden" name="id" value={p.id} />
                  <button name="acao" value="alternar" className={p.ativo ? "botao-peq-sec" : "botao-peq"}>
                    {p.ativo ? "Tirar de venda" : "Voltar a vender"}
                  </button>
                </form>
                {n === 0 && (
                  <form action={acaoPlanoApp}>
                    <input type="hidden" name="id" value={p.id} />
                    <button name="acao" value="excluir" className="botao-peq-perigo">
                      Excluir
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">+ Novo plano</summary>
          <div className="mt-3">
            {/* key muda quando um plano é criado: o formulário volta vazio */}
            <FormPlanoApp
              key={planos.length}
              novo
              p={{ nome: "", precoCentavos: 0, descricao: null, limiteAssinantes: null, limiteEntregadores: null, pagamentoOnline: false, produtosExtras: false, ordem: planos.length + 1 }}
            />
          </div>
        </details>
      </main>
    </>
  );
}
