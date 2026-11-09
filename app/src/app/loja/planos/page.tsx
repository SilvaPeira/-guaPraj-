import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { formatarReais } from "@/lib/validacao";
import { porSemanaTexto } from "@/lib/simulador";
import { salvarPlano } from "./actions";
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
  const avulso = galao?.precoCentavos ?? 0;

  return (
    <>
      <Topo titulo="Planos mensais" subtitulo={loja.nome} />
      <main className="conteudo">
        <p className="aviso-info text-sm">
          Dica: o plano deve sair de 5% a 15% mais barato que comprar avulso. Esse desconto é o principal motivo para o cliente assinar.
          Galão avulso hoje: <b>{formatarReais(avulso)}</b>.
        </p>
        <ul className="pilha">
          {planos.map((p) => {
            const cheio = p.galoesMes * avulso;
            const desconto = cheio ? Math.round((1 - p.precoCentavos / cheio) * 100) : 0;
            return (
              <li key={p.id} className={`cartao pilha ${p.ativo ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <b className="font-titulo text-lg">{p.galoesMes} galões/mês</b>
                    <p className="text-sm text-tinta-suave">
                      {porSemanaTexto(p.galoesMes)} por semana · {formatarReais(Math.round(p.precoCentavos / p.galoesMes))} o galão
                    </p>
                  </div>
                  {desconto > 0 ? (
                    <span className={`selo ${desconto > 15 ? "selo-terra" : "selo-acai"}`}>−{desconto}%</span>
                  ) : (
                    <span className="selo selo-terra">sem desconto</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={salvarPlano} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <label className="flex items-center gap-2 text-sm text-tinta-suave">
                      R$
                      <input
                        className="entrada min-h-11 w-28"
                        name="preco"
                        inputMode="decimal"
                        defaultValue={(p.precoCentavos / 100).toFixed(2).replace(".", ",")}
                        aria-label={`Preço do plano ${p.galoesMes}`}
                      />
                    </label>
                    <button className="botao-peq-sec">Salvar</button>
                  </form>
                  <form action={salvarPlano}>
                    <input type="hidden" name="id" value={p.id} />
                    <button name="acao" value="alternar" className={p.ativo ? "botao-peq-perigo" : "botao-peq"}>
                      {p.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        <FormNovoPlano />
      </main>
    </>
  );
}
