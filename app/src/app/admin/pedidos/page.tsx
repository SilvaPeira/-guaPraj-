import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Topo, Vazio } from "@/components/ui";
import { agoraLocal } from "@/lib/tempo";
import { COR_STATUS, ORIGEM, ROTULO_STATUS } from "@/lib/status";
import { formatarReais } from "@/lib/validacao";

export const metadata: Metadata = { title: "Pedidos" };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
const vizinho = (m: string, d: number) => {
  const [a, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(a, mm - 1 + d, 1)).toISOString().slice(0, 7);
};

export default async function Pedidos({ searchParams }: PageProps<"/admin/pedidos">) {
  const sp = await searchParams;
  const atual = agoraLocal().data.slice(0, 7);
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : atual;
  const lojaId = typeof sp.loja === "string" && /^[0-9a-f-]{36}$/.test(sp.loja) ? sp.loja : null;
  const db = await getDb();

  const filtros: SQL[] = [gte(schema.pedidos.data, `${mes}-01`), lt(schema.pedidos.data, `${vizinho(mes, 1)}-01`)];
  if (lojaId) filtros.push(eq(schema.pedidos.lojaId, lojaId));
  const onde = and(...filtros);

  const [lojas, porLoja, pedidos] = await Promise.all([
    db.select({ id: schema.lojas.id, nome: schema.lojas.nome }).from(schema.lojas).orderBy(asc(schema.lojas.nome)),
    db
      .select({
        lojaId: schema.pedidos.lojaId,
        nome: schema.lojas.nome,
        pedidos: sql<number>`count(*)::int`,
        entregues: sql<number>`count(*) filter (where ${schema.pedidos.status} in ('entregue','retirado'))::int`,
        valor: sql<number>`coalesce(sum(case when ${schema.pedidos.status} in ('entregue','retirado') then ${schema.pedidos.totalCentavos} end), 0)::int`,
        online: sql<number>`coalesce(sum(case when ${schema.pedidos.formaPagamento} = 'online' and ${schema.pedidos.statusPagamento} = 'pago' then ${schema.pedidos.totalCentavos} end), 0)::int`,
      })
      .from(schema.pedidos)
      .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
      .where(onde)
      .groupBy(schema.pedidos.lojaId, schema.lojas.nome),
    db
      .select({ p: schema.pedidos, loja: schema.lojas.nome, cliente: schema.usuarios.nome })
      .from(schema.pedidos)
      .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
      .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.pedidos.clienteId))
      .where(onde)
      .orderBy(desc(schema.pedidos.data), desc(schema.pedidos.numero))
      .limit(60),
  ]);
  const total = porLoja.reduce((t, l) => ({ pedidos: t.pedidos + l.pedidos, valor: t.valor + l.valor, online: t.online + l.online }), { pedidos: 0, valor: 0, online: 0 });
  const q = (m: string, l: string | null) => `/admin/pedidos?mes=${m}${l ? `&loja=${l}` : ""}`;

  return (
    <>
      <Topo titulo="Pedidos" subtitulo="Todas as distribuidoras" voltar="/admin" />
      <main className="conteudo">
        <nav className="flex items-center justify-between" aria-label="Mês">
          <Link className="botao-peq-sec" href={q(vizinho(mes, -1), lojaId)} aria-label="Mês anterior">
            ‹
          </Link>
          <b className="font-titulo text-lg first-letter:uppercase">{nomeMes(mes)}</b>
          {mes < atual ? (
            <Link className="botao-peq-sec" href={q(vizinho(mes, 1), lojaId)} aria-label="Próximo mês">
              ›
            </Link>
          ) : (
            <span className="w-11" />
          )}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="mes" value={mes} />
          <select className="entrada min-h-11 flex-1" name="loja" defaultValue={lojaId ?? ""}>
            <option value="">Todas as lojas</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
          <button className="botao-peq-sec">Filtrar</button>
        </form>

        <div className="grid grid-cols-3 gap-2">
          <div className="cartao p-3">
            <b className="block font-titulo text-lg">{total.pedidos}</b>
            <span className="text-xs text-tinta-suave">pedidos</span>
          </div>
          <div className="cartao p-3">
            <b className="block font-titulo text-lg">{formatarReais(total.valor)}</b>
            <span className="text-xs text-tinta-suave">entregue</span>
          </div>
          <div className="cartao p-3">
            <b className="block font-titulo text-lg">{formatarReais(total.online)}</b>
            <span className="text-xs text-tinta-suave">pago pelo app</span>
          </div>
        </div>

        {!lojaId && porLoja.length > 0 && (
          <>
            <h2 className="titulo-secao mt-2">Por loja</h2>
            <ul className="cartao divide-y divide-borda py-1">
              {porLoja
                .sort((a, b) => b.valor - a.valor)
                .map((l) => (
                  <li key={l.lojaId}>
                    <Link href={q(mes, l.lojaId)} className="flex justify-between gap-2 py-2.5 text-sm">
                      <span>
                        <b>{l.nome}</b>
                        <span className="text-tinta-suave">
                          {" "}
                          · {l.pedidos} pedido(s), {l.entregues} entregue(s)
                        </span>
                      </span>
                      <b>{formatarReais(l.valor)}</b>
                    </Link>
                  </li>
                ))}
            </ul>
          </>
        )}

        <h2 className="titulo-secao mt-2">Últimos pedidos</h2>
        {pedidos.length === 0 ? (
          <Vazio>Nenhum pedido neste mês.</Vazio>
        ) : (
          <ul className="cartao divide-y divide-borda py-1">
            {pedidos.map(({ p, loja, cliente }) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <b>#{p.numero}</b> · {p.data.slice(8, 10)}/{p.data.slice(5, 7)} · {ORIGEM[p.origem]}
                  <p className="truncate text-tinta-suave">
                    {loja} → {cliente ?? "Cliente"}
                  </p>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                  <span className={`selo ${COR_STATUS[p.status]}`}>{ROTULO_STATUS[p.status]}</span>
                  <span>
                    {p.totalCentavos ? formatarReais(p.totalCentavos) : "plano"}
                    {p.statusPagamento === "pago" ? " · pago" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
