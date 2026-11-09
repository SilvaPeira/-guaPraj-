import type { Metadata } from "next";
import { and, asc, count, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { formatarReais } from "@/lib/validacao";
import { frequenciaTexto } from "@/lib/simulador";
import { criarSugeridos, salvarPlano } from "./actions";
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
                <form action={salvarPlano} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="campo">
                    Galões/mês
                    <input className="entrada min-h-11" name="galoes" inputMode="numeric" defaultValue={p.galoesMes} disabled={n > 0} title={n > 0 ? "Tem assinantes: crie outro plano para mudar a quantidade" : undefined} />
                  </label>
                  <label className="campo">
                    Preço (R$)
                    <input className="entrada min-h-11" name="preco" inputMode="decimal" defaultValue={(p.precoCentavos / 100).toFixed(2).replace(".", ",")} />
                  </label>
                  <button className="botao-peq-sec">Salvar</button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={salvarPlano}>
                    <input type="hidden" name="id" value={p.id} />
                    <button name="acao" value="alternar" className={p.ativo ? "botao-peq-sec" : "botao-peq"}>
                      {p.ativo ? "Pausar vendas" : "Voltar a vender"}
                    </button>
                  </form>
                  {n === 0 && (
                    <form action={salvarPlano}>
                      <input type="hidden" name="id" value={p.id} />
                      <button name="acao" value="excluir" className="botao-peq-perigo">
                        Excluir
                      </button>
                    </form>
                  )}
                </div>
                {n > 0 && <p className="text-xs text-tinta-suave">Plano com assinantes: a quantidade fica travada e ele não pode ser excluído. Mudança de preço vale a partir do próximo ciclo.</p>}
              </li>
            );
          })}
        </ul>
        <FormNovoPlano precoAvulsoCentavos={avulso} />
      </main>
    </>
  );
}
