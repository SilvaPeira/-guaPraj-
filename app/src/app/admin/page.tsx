import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Hero, Logo, Vazio } from "@/components/ui";
import { agoraLocal } from "@/lib/tempo";
import { calcularSituacao, listarPlanosApp } from "@/lib/planos-app";
import { formatarReais } from "@/lib/validacao";
import { mudarStatusLoja } from "./actions";
import { sair } from "../entrar/actions";
import { errosRecentes } from "@/lib/erros";

export const metadata: Metadata = { title: "Admin" };

export default async function Admin() {
  const db = await getDb();
  const hoje = agoraLocal().data;
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const [a, m] = hoje.split("-").map(Number);
  const proximoMes = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);

  const nErros = await errosRecentes(24);
  const [lojas, planosApp, [{ clientes }], [{ assinaturas }], [mes]] = await Promise.all([
    db.select().from(schema.lojas),
    listarPlanosApp(),
    db.select({ clientes: count() }).from(schema.usuarios).where(eq(schema.usuarios.papel, "cliente")),
    db.select({ assinaturas: count() }).from(schema.assinaturas).where(inArray(schema.assinaturas.status, ["ativa", "pausada"])),
    db
      .select({
        pedidos: sql<number>`count(*)::int`,
        movimentado: sql<number>`coalesce(sum(case when ${schema.pedidos.status} in ('entregue','retirado') then ${schema.pedidos.totalCentavos} end), 0)::int`,
      })
      .from(schema.pedidos)
      .where(and(gte(schema.pedidos.data, inicioMes), lt(schema.pedidos.data, proximoMes))),
  ]);

  const pendentes = lojas.filter((l) => l.status === "pendente");
  const aprovadas = lojas.filter((l) => l.status === "aprovada");
  // Receita mensal recorrente: lojas aprovadas com plano pago em dia.
  const situacoes = aprovadas.map((l) => ({ l, s: calcularSituacao(l, planosApp, hoje) }));
  const pagantes = situacoes.filter(({ s }) => s.vigente && s.vigente.precoCentavos > 0);
  const mrr = pagantes.reduce((t, { s }) => t + s.vigente!.precoCentavos, 0);
  const aguardando = situacoes.filter(({ s }) => s.vencido);

  return (
    <>
      <Hero>
        <div className="flex items-center justify-between">
          <Logo />
          <form action={sair}>
            <button className="min-h-11 text-sm font-semibold text-hero-texto underline">Sair</button>
          </form>
        </div>
        <h1 className="mt-5 text-[26px] font-bold">Painel do ÁguaPrajá</h1>
        <p className="text-sm text-hero-texto">
          <Link href="/sobre" className="underline">
            Ver o site do ÁguaPrajá
          </Link>
        </p>
      </Hero>
      <main className="conteudo -mt-10">
        <section className="cartao-elevado">
          <span className="text-sm text-tinta-suave">Receita mensal (mensalidades em dia)</span>
          <b className="block font-titulo text-[30px] leading-tight">{formatarReais(mrr)}</b>
          <span className="text-sm text-tinta-suave">
            {pagantes.length} loja(s) pagante(s) de {aprovadas.length} ativa(s)
          </span>
        </section>
        {nErros > 0 && (
          <Link href="/admin/erros" className="cartao flex items-center justify-between gap-2 border-2 border-terra">
            <span>
              <b className="block">
                {nErros} {nErros === 1 ? "erro" : "erros"} no servidor nas últimas 24 h
              </b>
              <span className="text-sm text-tinta-suave">Toque para ver o que aconteceu e onde.</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Kpi valor={String(pendentes.length)} rotulo="lojas em análise" destaque={pendentes.length > 0} />
          <Kpi valor={String(clientes)} rotulo="clientes" />
          <Kpi valor={String(assinaturas)} rotulo="assinaturas" />
          <Kpi valor={String(mes.pedidos)} rotulo="pedidos no mês" />
          <Kpi valor={formatarReais(mes.movimentado)} rotulo="entregue no mês" />
          <Kpi valor={String(aguardando.length)} rotulo="aguardando pagamento" destaque={aguardando.length > 0} />
        </div>

        <h2 className="titulo-secao mt-2">Lojas para aprovar</h2>
        {pendentes.length === 0 ? (
          <Vazio>Nenhuma loja esperando aprovação.</Vazio>
        ) : (
          pendentes.map((l) => (
            <article key={l.id} className="cartao flex flex-wrap items-center justify-between gap-2">
              <div>
                <b>{l.nome}</b>
                <p className="text-sm text-tinta-suave">
                  {l.bairro}, {l.cidade} · doc. {l.documento}
                </p>
              </div>
              <form action={mudarStatusLoja} className="flex gap-2">
                <input type="hidden" name="id" value={l.id} />
                <button name="status" value="aprovada" className="botao-peq">
                  Aprovar
                </button>
                <Link href={`/admin/lojas?ver=${l.id}`} className="botao-peq-sec">
                  Detalhes
                </Link>
              </form>
            </article>
          ))
        )}

        {aguardando.length > 0 && (
          <>
            <h2 className="titulo-secao mt-2">Mensalidades para receber</h2>
            {aguardando.map(({ l, s }) => (
              <Link key={l.id} href={`/admin/lojas?ver=${l.id}`} className="cartao flex items-center justify-between gap-2">
                <span>
                  <b className="block">{l.nome}</b>
                  <span className="text-sm text-tinta-suave">
                    {s.escolhido!.nome} · {formatarReais(s.escolhido!.precoCentavos)}/mês
                  </span>
                </span>
                <span className="selo selo-terra">A receber</span>
              </Link>
            ))}
          </>
        )}
      </main>
    </>
  );
}

function Kpi({ valor, rotulo, destaque = false }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`cartao p-3 ${destaque ? "border-2 border-terra" : ""}`}>
      <b className="block font-titulo text-lg leading-tight">{valor}</b>
      <span className="text-xs text-tinta-suave">{rotulo}</span>
    </div>
  );
}
