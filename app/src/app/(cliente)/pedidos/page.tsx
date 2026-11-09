import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt, notInArray, or } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { agoraLocal, dataBonita } from "@/lib/tempo";
import { COR_STATUS, ORIGEM, ROTULO_STATUS, STATUS_FINAIS } from "@/lib/status";
import { formatarReais } from "@/lib/validacao";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Meus pedidos" };

type Pedido = typeof schema.pedidos.$inferSelect & { lojaNome: string };

export default async function Pedidos() {
  const { usuario, db } = await exigirCliente();
  const hoje = agoraLocal().data;
  const campos = { p: schema.pedidos, lojaNome: schema.lojas.nome };
  const base = db.select(campos).from(schema.pedidos).innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId));
  const [abertos, historico] = await Promise.all([
    base
      .where(and(eq(schema.pedidos.clienteId, usuario.id), gte(schema.pedidos.data, hoje), notInArray(schema.pedidos.status, STATUS_FINAIS)))
      .orderBy(asc(schema.pedidos.data), asc(schema.pedidos.horaInicio))
      .limit(15),
    db
      .select(campos)
      .from(schema.pedidos)
      .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
      .where(and(eq(schema.pedidos.clienteId, usuario.id), or(lt(schema.pedidos.data, hoje), inArray(schema.pedidos.status, STATUS_FINAIS))))
      .orderBy(desc(schema.pedidos.data), desc(schema.pedidos.numero))
      .limit(30),
  ]);
  const lista = (rows: { p: typeof schema.pedidos.$inferSelect; lojaNome: string }[]): Pedido[] => rows.map((r) => ({ ...r.p, lojaNome: r.lojaNome }));

  return (
    <>
      <Topo titulo="Meus pedidos" />
      <main className="conteudo">
        <h2 className="titulo-secao">Agendados</h2>
        {abertos.length === 0 ? <Vazio>Nada agendado.</Vazio> : <Lista pedidos={lista(abertos)} hoje={hoje} />}
        <h2 className="titulo-secao mt-2">Histórico</h2>
        {historico.length === 0 ? <Vazio>Seus pedidos entregues aparecem aqui.</Vazio> : <Lista pedidos={lista(historico)} hoje={hoje} />}
      </main>
    </>
  );
}

function Lista({ pedidos, hoje }: { pedidos: Pedido[]; hoje: string }) {
  return (
    <ul className="cartao divide-y divide-borda py-1">
      {pedidos.map((p) => (
        <li key={p.id}>
          <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between gap-2 py-3">
            <span className="min-w-0">
              <b className="block text-sm">
                {dataBonita(p.data, hoje)} · {p.horaInicio === p.horaFim ? `às ${p.horaInicio}` : `${p.horaInicio}–${p.horaFim}`}
              </b>
              <span className="block truncate text-sm text-tinta-suave">
                #{p.numero} · {ORIGEM[p.origem]} · {p.lojaNome}
                {p.totalCentavos > 0 ? ` · ${formatarReais(p.totalCentavos)}` : ""}
              </span>
            </span>
            <span className={`selo ${COR_STATUS[p.status]}`}>{ROTULO_STATUS[p.status]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
