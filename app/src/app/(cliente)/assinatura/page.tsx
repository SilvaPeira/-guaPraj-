import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { descreverAgenda } from "@/lib/agenda";
import { fimDoCiclo, galoesNoCiclo, gerarEntregas } from "@/lib/pedidos";
import { distanciaKm, RAIO_RETIRADA_KM } from "@/lib/geo";
import { regrasParaCliente } from "@/lib/opcoes-pedido";
import { agoraLocal, dataBonita, somarDias } from "@/lib/tempo";
import { formatarReais } from "@/lib/validacao";
import { Topo, Vazio } from "@/components/ui";
import FormAgenda from "@/components/FormAgenda";
import { pular, salvarAgenda } from "./actions";
import { FormCancelar, FormTrocarPlano } from "./Formularios";

export const metadata: Metadata = { title: "Minha assinatura" };

const ROTULO_STATUS: Record<string, string> = {
  recebido: "Agendada",
  confirmado: "Confirmada",
  separacao: "Em separação",
  saiu: "Saiu para entrega",
  pronto_retirada: "Pronta para retirada",
  entregue: "Entregue",
  retirado: "Retirada",
};

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function Assinatura({ searchParams }: PageProps<"/assinatura">) {
  const sp = await searchParams;
  const { usuario, endereco, db } = await exigirCliente();
  const [a] = await db
    .select()
    .from(schema.assinaturas)
    .where(eq(schema.assinaturas.clienteId, usuario.id))
    .orderBy(desc(schema.assinaturas.criadoEm))
    .limit(1);

  if (!a) {
    return (
      <>
        <Topo titulo="Minha assinatura" voltar="/inicio" />
        <main className="conteudo">
          <Vazio>
            <b className="block text-tinta">Você ainda não tem um plano.</b>
            <Link href="/simulador" className="link-texto">
              Escolher meu plano
            </Link>
          </Vazio>
        </main>
      </>
    );
  }

  await gerarEntregas(db, a.id); // mantém as próximas semanas sempre geradas
  const hoje = agoraLocal().data;
  const amanha = somarDias(hoje, 1);
  const [[plano], [loja], planosLoja, proximas] = await Promise.all([
    db.select().from(schema.planos).where(eq(schema.planos.id, a.planoId)).limit(1),
    db.select().from(schema.lojas).where(eq(schema.lojas.id, a.lojaId)).limit(1),
    db.select().from(schema.planos).where(and(eq(schema.planos.lojaId, a.lojaId), eq(schema.planos.ativo, true))).orderBy(asc(schema.planos.galoesMes)),
    db
      .select()
      .from(schema.pedidos)
      .where(and(eq(schema.pedidos.assinaturaId, a.id), eq(schema.pedidos.origem, "plano"), gte(schema.pedidos.data, hoje), inArray(schema.pedidos.status, ["recebido", "confirmado", "separacao", "saiu", "pronto_retirada"])))
      .orderBy(asc(schema.pedidos.data))
      .limit(6),
  ]);
  const ciclo = await galoesNoCiclo(db, a);
  const proximoPlano = a.planoProximoId ? planosLoja.find((p) => p.id === a.planoProximoId) : null;
  const pulosFuturos = a.pulos.filter((d) => d >= amanha).sort();
  const cancelada = a.status === "cancelada";
  const km = distanciaKm(endereco, loja);
  const podeEntregar = loja.fazEntrega && km <= loja.raioKm;
  const podeRetirar = loja.fazRetirada && km <= RAIO_RETIRADA_KM;
  const proxCiclo = br(somarDias(fimDoCiclo(a.cicloInicio), 1));

  return (
    <>
      <Topo titulo="Minha assinatura" subtitulo={loja.nome} voltar="/inicio" />
      <main className="conteudo">
        {sp.nova && <p className="aviso-ok">Plano assinado! A distribuidora já recebeu suas entregas na agenda.</p>}
        {sp.alterada && <p className="aviso-ok">Dia e horário alterados. As próximas entregas já seguem a nova agenda.</p>}

        <section className="rounded-[20px] bg-acai p-4 text-white">
          <div className="flex items-center justify-between">
            <b className="font-titulo text-lg">
              Plano {plano.galoesMes} {plano.galoesMes === 1 ? "galão" : "galões"}
            </b>
            <span className="text-sm text-[#e6d3ea]">{formatarReais(plano.precoCentavos)}/mês</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={ciclo.entregues} aria-valuemax={plano.galoesMes} aria-label="Galões recebidos no mês">
            <div className="h-full rounded-full bg-[#f2a65a]" style={{ width: `${Math.min(100, Math.round((ciclo.entregues / plano.galoesMes) * 100))}%` }} />
          </div>
          <p className="mt-2 text-sm">
            {ciclo.entregues} de {plano.galoesMes} recebidos neste mês (até {br(ciclo.fim)}) · {ciclo.programados} programados
          </p>
          <p className="mt-1 text-sm text-[#e6d3ea]">{cancelada ? `Cancelado · entregas até ${br(a.validaAte ?? ciclo.fim)}` : descreverAgenda(a.agenda)}</p>
          {proximoPlano && <p className="mt-1 text-sm text-[#e6d3ea]">A partir de {proxCiclo}: plano {proximoPlano.galoesMes} galões ({formatarReais(proximoPlano.precoCentavos)}).</p>}
        </section>

        {a.aceiteTexto && (
          <p className="text-xs text-tinta-suave">
            Você confirmou: “{a.aceiteTexto}”
          </p>
        )}

        <h2 className="titulo-secao mt-1">Próximas entregas</h2>
        {proximas.length === 0 && <Vazio>Nenhuma entrega nas próximas semanas.</Vazio>}
        <ul className="cartao divide-y divide-borda py-1">
          {proximas.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
              <Link href={`/pedidos/${p.id}`} className="min-w-0">
                <b className="block text-sm">{dataBonita(p.data, hoje)}</b>
                <span className="text-sm text-tinta-suave">
                  {p.horaInicio === p.horaFim ? `às ${p.horaInicio}` : `${p.horaInicio}–${p.horaFim}`} · {ROTULO_STATUS[p.status]}
                </span>
              </Link>
              {!cancelada && p.data >= amanha && p.status === "recebido" && (
                <form action={pular}>
                  <input type="hidden" name="assinaturaId" value={a.id} />
                  <input type="hidden" name="data" value={p.data} />
                  <button className="botao-peq-sec">Pular</button>
                </form>
              )}
            </li>
          ))}
          {pulosFuturos.map((d) => (
            <li key={d} className="flex items-center justify-between gap-2 py-2.5 opacity-70">
              <span className="text-sm">
                <b>{dataBonita(d, hoje)}</b> · pulada
              </span>
              <form action={pular}>
                <input type="hidden" name="assinaturaId" value={a.id} />
                <input type="hidden" name="data" value={d} />
                <button className="botao-peq-sec">Desfazer</button>
              </form>
            </li>
          ))}
        </ul>

        {!cancelada && (
          <>
            <Link href={`/pedir/${loja.id}?assinatura=${a.id}`} className="botao">
              Compra adicional (galão extra ou bebidas)
            </Link>

            <details className="cartao">
              <summary className="cursor-pointer list-none font-bold">Alterar dia e horário</summary>
              <div className="mt-3">
                <FormAgenda
                  acao={salvarAgenda}
                  camposExtras={{ assinaturaId: a.id }}
                  planoGaloes={plano.galoesMes}
                  regras={regrasParaCliente(loja.regrasHorario)}
                  diasLoja={loja.regrasHorario.dias}
                  podeEntregar={podeEntregar}
                  podeRetirar={podeRetirar}
                  inicial={{ agenda: a.agenda, modo: a.modo }}
                  textoBotao="Salvar novo dia e horário"
                />
                <p className="mt-2 text-xs text-tinta-suave">Vale a partir de amanhã. Entregas de hoje não mudam.</p>
              </div>
            </details>

            <details className="cartao">
              <summary className="cursor-pointer list-none font-bold">Trocar de plano</summary>
              <div className="mt-3">
                <FormTrocarPlano
                  assinaturaId={a.id}
                  planoAtualId={a.planoId}
                  planoProximoId={a.planoProximoId}
                  planos={planosLoja.map((p) => ({ id: p.id, galoesMes: p.galoesMes, precoCentavos: p.precoCentavos }))}
                  aPartirDe={proxCiclo}
                />
              </div>
            </details>

            <details className="cartao">
              <summary className="cursor-pointer list-none font-bold text-terra-esc">Cancelar plano</summary>
              <div className="mt-3">
                <FormCancelar assinaturaId={a.id} validaAte={br(ciclo.fim)} />
              </div>
            </details>
          </>
        )}
        {cancelada && (
          <Link href="/simulador" className="botao-sec">
            Assinar um novo plano
          </Link>
        )}
      </main>
    </>
  );
}
