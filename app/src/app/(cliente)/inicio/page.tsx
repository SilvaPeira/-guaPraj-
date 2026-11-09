import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { descreverAgenda, descreverHorario } from "@/lib/agenda";
import { galoesNoCiclo, gerarEntregas } from "@/lib/pedidos";
import { agoraLocal, dataBonita } from "@/lib/tempo";
import { COR_STATUS, ORIGEM, ROTULO_STATUS } from "@/lib/status";
import { formatarReais } from "@/lib/validacao";
import { Hero, Logo } from "@/components/ui";
import { sair } from "@/app/entrar/actions";

export const metadata: Metadata = { title: "Início" };

export default async function Inicio() {
  const { usuario: u, endereco: end, db } = await exigirCliente();
  const hoje = agoraLocal().data;

  const [assinatura] = await db
    .select({ a: schema.assinaturas, plano: schema.planos, loja: schema.lojas })
    .from(schema.assinaturas)
    .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId))
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.assinaturas.lojaId))
    .where(and(eq(schema.assinaturas.clienteId, u.id), inArray(schema.assinaturas.status, ["ativa", "pausada", "cancelada"])))
    .orderBy(desc(schema.assinaturas.criadoEm))
    .limit(1);
  if (assinatura && assinatura.a.status !== "cancelada") await gerarEntregas(db, assinatura.a.id);
  const ciclo = assinatura ? await galoesNoCiclo(db, assinatura.a) : null;

  const proximos = await db
    .select({ p: schema.pedidos, lojaNome: schema.lojas.nome })
    .from(schema.pedidos)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
    .where(and(eq(schema.pedidos.clienteId, u.id), gte(schema.pedidos.data, hoje), inArray(schema.pedidos.status, ["recebido", "confirmado", "separacao", "saiu", "pronto_retirada"])))
    .orderBy(asc(schema.pedidos.data), asc(schema.pedidos.horaInicio))
    .limit(4);
  const prox = proximos[0]?.p;
  const ativa = assinatura && assinatura.a.status !== "cancelada" ? assinatura : null;

  return (
    <>
      <Hero>
        <div className="flex items-center justify-between">
          <Logo />
          <form action={sair}>
            <button className="min-h-11 text-sm font-semibold text-hero-texto underline">Sair</button>
          </form>
        </div>
        <p className="mt-5 text-sm text-hero-texto">
          {end.cidade}, PA · {end.bairro}
        </p>
        <h1 className="text-[26px] font-bold">Olá, {u.nome!.split(" ")[0]}!</h1>
      </Hero>
      <main className="conteudo -mt-10">
        {prox ? (
          <Link href={`/pedidos/${prox.id}`} className="cartao-elevado pilha">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[.6px] text-tinta-suave">Próxima {prox.modo === "entrega" ? "entrega" : "retirada"}</span>
              <span className={`selo ${COR_STATUS[prox.status]}`}>{ROTULO_STATUS[prox.status]}</span>
            </div>
            <b className="font-titulo text-lg">{dataBonita(prox.data, hoje)}</b>
            <span className="text-sm text-tinta-suave">
              {descreverHorario(prox.tipoHorario, prox.horaInicio, prox.horaFim)} · {ORIGEM[prox.origem]} · {proximos[0].lojaNome}
            </span>
          </Link>
        ) : (
          !ativa && (
            <div className="cartao-elevado pilha">
              <b className="font-titulo text-lg">Você ainda não tem um plano</b>
              <p className="text-sm text-tinta-suave">Calcule o consumo da família e escolha uma distribuidora do seu bairro.</p>
              <Link href={u.perfilFamilia ? "/lojas" : "/simulador"} className="botao-peq self-start">
                Escolher meu plano
              </Link>
            </div>
          )
        )}

        {ativa && ciclo && (
          <Link href="/assinatura" className="block rounded-[20px] bg-acai p-4 text-white">
            <div className="flex items-center justify-between">
              <b className="font-titulo text-lg">
                Plano {ativa.plano.galoesMes} {ativa.plano.galoesMes === 1 ? "galão" : "galões"}
              </b>
              <span className="text-sm text-[#e6d3ea]">{formatarReais(ativa.plano.precoCentavos)}/mês</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <div className="h-full rounded-full bg-[#f2a65a]" style={{ width: `${Math.min(100, Math.round((ciclo.entregues / ativa.plano.galoesMes) * 100))}%` }} />
            </div>
            <p className="mt-2 text-sm">
              {ciclo.entregues} de {ativa.plano.galoesMes} recebidos este mês
            </p>
            <p className="text-sm text-[#e6d3ea]">
              {ativa.loja.nome} · {descreverAgenda(ativa.a.agenda)}
            </p>
            <span className="mt-2 inline-block text-sm font-semibold underline">Gerenciar: mudar horário, pular, extra, cancelar</span>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {ativa ? (
            <Atalho href={`/pedir/${ativa.loja.id}?assinatura=${ativa.a.id}`} titulo="Compra adicional" texto="Galão extra ou bebidas" />
          ) : (
            <Atalho href={u.perfilFamilia ? "/lojas" : "/simulador"} titulo="Pedido avulso" texto="Galão e bebidas agora" />
          )}
          <Atalho href="/simulador" titulo="Recalcular consumo" texto="Mudou quem mora na casa?" />
        </div>

        {proximos.length > 1 && (
          <>
            <h2 className="titulo-secao mt-1">Próximos</h2>
            <ul className="cartao divide-y divide-borda py-1">
              {proximos.slice(1).map(({ p }) => (
                <li key={p.id}>
                  <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      <b>{dataBonita(p.data, hoje)}</b> · {p.horaInicio === p.horaFim ? `às ${p.horaInicio}` : `${p.horaInicio}–${p.horaFim}`}
                    </span>
                    <span className="text-tinta-suave">{ORIGEM[p.origem]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="cartao pilha">
          <div className="flex items-center justify-between gap-2">
            <b>Endereço de entrega</b>
            <Link href="/cadastro" className="link-texto">
              Alterar
            </Link>
          </div>
          <p className="text-sm text-tinta-suave">
            {end.logradouro}
            {end.numero ? `, ${end.numero}` : ""}
            {end.complemento ? ` · ${end.complemento}` : ""} — {end.bairro}
            {end.referencia ? (
              <>
                <br />
                Ref.: {end.referencia}
              </>
            ) : null}
          </p>
        </div>
      </main>
    </>
  );
}

function Atalho({ href, titulo, texto }: { href: string; titulo: string; texto: string }) {
  return (
    <Link href={href} className="flex min-h-20 flex-col gap-1 rounded-2xl border border-borda bg-white p-3.5">
      <b className="text-sm">{titulo}</b>
      <span className="text-xs text-tinta-suave">{texto}</span>
    </Link>
  );
}
