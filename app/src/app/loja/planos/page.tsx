import type { Metadata } from "next";
import { and, asc, count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { formatarReais } from "@/lib/validacao";
import { frequenciaTexto } from "@/lib/simulador";
import { criarSugeridos } from "./actions";
import PlanoEditavel from "./PlanoEditavel";
import FormNovoPlano from "./FormNovoPlano";

export const metadata: Metadata = { title: "Planos" };

export default async function Planos() {
  const { loja, db } = await exigirLoja();
  const [galao] = await db
    .select()
    .from(schema.produtos)
    .where(and(eq(schema.produtos.lojaId, loja.id), eq(schema.produtos.categoria, "agua_galao")))
    .limit(1);
  const planos = await db.select().from(schema.planos).where(eq(schema.planos.lojaId, loja.id)).orderBy(asc(schema.planos.galoesMes));
  const assinantes = await db
    .select({ planoId: schema.assinaturas.planoId, n: count() })
    .from(schema.assinaturas)
    .where(eq(schema.assinaturas.lojaId, loja.id))
    .groupBy(schema.assinaturas.planoId);
  const nAssin = (id: string) => assinantes.find((a) => a.planoId === id)?.n ?? 0;
  const avulso = galao?.precoCentavos ?? 0;

  return (
    <>
      <Topo titulo="Planos mensais" subtitulo={loja.nome} />
      <main className="conteudo">
        <p className="aviso-info text-sm">
          Você define quantos galões por mês e o preço de cada plano. Dica: um desconto de 5% a 15% sobre o avulso é o que faz o cliente
          assinar. Galão avulso hoje: <b>{formatarReais(avulso)}</b>.
        </p>

        {planos.length === 0 && (
          <div className="cartao pilha">
            <b>Você ainda não tem planos.</b>
            <p className="text-sm text-tinta-suave">Crie os seus abaixo, ou comece com os sugeridos (8, 12, 16, 20, 24 e 32 galões com 10% de desconto) e ajuste depois.</p>
            <form action={criarSugeridos}>
              <button className="botao-sec">Usar planos sugeridos</button>
            </form>
          </div>
        )}

        <ul className="pilha">
          {planos.map((p) => {
            const cheio = p.galoesMes * avulso;
            const desconto = cheio ? Math.round((1 - p.precoCentavos / cheio) * 100) : 0;
            const n = nAssin(p.id);
            return (
              <li key={p.id} className={`cartao pilha ${p.ativo ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <b className="font-titulo text-lg">
                      {p.galoesMes} {p.galoesMes === 1 ? "galão" : "galões"}/mês · {formatarReais(p.precoCentavos)}
                    </b>
                    <p className="text-sm text-tinta-suave">
                      {frequenciaTexto(p.galoesMes)} · {formatarReais(Math.round(p.precoCentavos / p.galoesMes))} o galão
                      {n > 0 ? ` · ${n} ${n === 1 ? "assinante" : "assinantes"}` : ""}
                    </p>
                  </div>
                  {desconto > 0 ? (
                    <span className={`selo ${desconto > 15 ? "selo-terra" : "selo-acai"}`}>−{desconto}%</span>
                  ) : (
                    <span className="selo selo-terra">sem desconto</span>
                  )}
                </div>
                <PlanoEditavel id={p.id} galoesMes={p.galoesMes} precoCentavos={p.precoCentavos} ativo={p.ativo} assinantes={n} />
              </li>
            );
          })}
        </ul>
        <FormNovoPlano precoAvulsoCentavos={avulso} />
      </main>
    </>
  );
}
