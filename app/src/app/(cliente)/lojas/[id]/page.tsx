import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { mediasDasLojas, textoNota } from "@/lib/avaliacoes";
import { marcaAtual } from "@/lib/marca";
import { descontoPercentual, planoSugerido } from "@/lib/lojas-proximas";
import { frequenciaTexto, simular } from "@/lib/simulador";
import { distanciaKm, formatarKm } from "@/lib/geo";
import { CATEGORIAS, ORDEM_GRUPOS, podeVender } from "@/lib/catalogo";
import { ehExtra, recursosDaLoja } from "@/lib/planos-app";
import { formatarReais } from "@/lib/validacao";
import { Topo } from "@/components/ui";
import FotoProduto, { urlFoto } from "@/components/FotoProduto";

export const metadata: Metadata = { title: "Distribuidora" };

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Loja({ params }: PageProps<"/lojas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { usuario, endereco, db } = await exigirCliente();
  const [loja] = await db
    .select()
    .from(schema.lojas)
    .where(and(eq(schema.lojas.id, id), eq(schema.lojas.status, "aprovada")))
    .limit(1);
  if (!loja) notFound();

  const [planos, produtos] = await Promise.all([
    db.select().from(schema.planos).where(and(eq(schema.planos.lojaId, loja.id), eq(schema.planos.ativo, true))).orderBy(asc(schema.planos.galoesMes)),
    db.select().from(schema.produtos).where(eq(schema.produtos.lojaId, loja.id)).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome)),
  ]);
  const { produtosExtras } = await recursosDaLoja(loja.id);
  const aVenda = produtos.filter((p) => podeVender(p) && (produtosExtras || !ehExtra(p.categoria)));
  const galao = aVenda.find((p) => p.categoria === "agua_galao");
  const r = usuario.perfilFamilia ? simular(usuario.perfilFamilia, usuario.perfilFamilia) : null;
  const sugerido = r ? planoSugerido(planos, r.galoesMes) : null;
  const km = distanciaKm(endereco, loja);
  const nota = textoNota((await mediasDasLojas([loja.id])).get(loja.id));
  const entregaAqui = loja.fazEntrega && km <= loja.raioKm;
  const grupos = ORDEM_GRUPOS.map((g) => ({
    grupo: g,
    itens: aVenda.filter((p) => CATEGORIAS[p.categoria].grupo === g && p.categoria !== "agua_galao"),
  })).filter((g) => g.itens.length);
  const regras = loja.regrasHorario;
  const marca = await marcaAtual();
  // Plano mensal: o cliente assina com UMA distribuidora; avulso pode pedir em qualquer uma.
  const [plano] = await db
    .select({ id: schema.assinaturas.id, lojaId: schema.assinaturas.lojaId, lojaNome: schema.lojas.nome })
    .from(schema.assinaturas)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.assinaturas.lojaId))
    .where(and(eq(schema.assinaturas.clienteId, usuario.id), inArray(schema.assinaturas.status, ["ativa", "pausada"])))
    .limit(1);
  const assinaAqui = plano?.lojaId === loja.id;
  const linkPedir = (itemId?: string) => {
    const u = new URLSearchParams();
    if (itemId) u.set("item", itemId);
    if (assinaAqui) u.set("assinatura", plano.id);
    return u.size ? `/pedir/${loja.id}?${u}` : `/pedir/${loja.id}`;
  };

  return (
    <>
      <Topo titulo={loja.nome} subtitulo={`${loja.bairro} · ${formatarKm(km)}${nota ? ` · ${nota}` : ""}`} voltar={marca ? "/inicio" : "/catalogo"} />
      <main className="conteudo">
        <section className="cartao pilha">
          <div className="flex flex-wrap gap-1.5">
            {entregaAqui ? (
              <span className="selo selo-verde">{loja.taxaEntregaCentavos ? `Entrega ${formatarReais(loja.taxaEntregaCentavos)}` : "Entrega grátis"}</span>
            ) : (
              loja.fazEntrega && <span className="selo selo-cinza">Não entrega no seu endereço</span>
            )}
            {loja.fazRetirada && <span className="selo selo-rio">Retirada no local</span>}
            {loja.seloFiscalDeclarado && <span className="selo selo-terra">Água com selo fiscal</span>}
          </div>
          <p className="text-sm text-tinta-suave">
            Abre {regras.dias.map((d) => DIAS[d]).join(", ")} · {regras.abre}–{regras.fecha}
            {regras.aceitaImediato && entregaAqui ? ` · entrega “o quanto antes” em até ${regras.prazoImediatoMin} min` : ""}
          </p>
          {galao && (
            <Link href={linkPedir()} className="flex items-center gap-3 rounded-xl bg-fundo p-2">
              <FotoProduto url={urlFoto(galao)} categoria="agua_galao" nome={galao.nome} />
              <span className="min-w-0 flex-1 text-sm">
                <b className="block text-[15px]">{galao.nome}</b>
                {galao.marca ? <span className="block text-tinta-suave">{galao.marca}</span> : null}
                <b className="block">{formatarReais(galao.precoCentavos)} avulso</b>
              </span>
            </Link>
          )}
          <Link href={linkPedir()} className="botao">
            {assinaAqui ? "Compra adicional" : "Fazer pedido"}
          </Link>
        </section>

        {plano && (
          <p className="aviso-info text-sm">
            {assinaAqui ? (
              <>Seu plano mensal é com esta distribuidora.</>
            ) : (
              <>
                Seu plano mensal é com a <b>{plano.lojaNome}</b>. Aqui você pode fazer pedidos avulsos normalmente. Para assinar com esta loja, cancele antes o
                plano atual.
              </>
            )}{" "}
            <Link href="/assinatura" className="link-texto">
              Ver meu plano
            </Link>
          </p>
        )}

        <h2 className="titulo-secao mt-1">Planos mensais</h2>
        {planos.map((p) => {
          const desc = descontoPercentual(p, galao?.precoCentavos ?? null);
          const ehSugerido = sugerido?.id === p.id;
          return (
            <Link key={p.id} href={plano ? "/assinatura" : `/assinar/${p.id}`} className={`flex items-center justify-between gap-2 rounded-[var(--raio-cartao,18px)] bg-white p-3.5 transition hover:border-verde ${ehSugerido ? "border-2 border-acai bg-acai-claro" : "border border-borda2"}`}>
              <div>
                <b className="text-base">{p.galoesMes} galões/mês</b>
                <p className="text-sm text-tinta-suave">
                  {frequenciaTexto(p.galoesMes)}{desc > 0 ? ` · economia de ${desc}%` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <b>{formatarReais(p.precoCentavos)}</b>
                {ehSugerido && <span className="selo bg-acai text-white">Sugerido</span>}
              </div>
            </Link>
          );
        })}
        {planos.length > 0 && !plano && <p className="text-sm text-tinta-suave">Toque num plano para escolher o dia e o horário das entregas.</p>}
        {planos.length === 0 && <p className="text-sm text-tinta-suave">Esta distribuidora ainda não tem planos mensais.</p>}

        {grupos.length > 0 && <h2 className="titulo-secao mt-2">Produtos</h2>}
        {grupos.map(({ grupo, itens }) => (
          <section key={grupo} className="cartao">
            <h3 className="mb-1 font-bold">{grupo}</h3>
            <ul className="divide-y divide-borda">
              {itens.map((p) => (
                <li key={p.id}>
                  <Link href={linkPedir(p.id)} className="flex items-center gap-3 py-2.5">
                    <FotoProduto url={urlFoto(p)} categoria={p.categoria} nome={p.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{p.nome}</p>
                      <p className="text-sm text-tinta-suave">
                        {p.marca ?? ""}
                        {p.alcoolico && <span className="selo selo-acai ml-1">18+</span>}
                      </p>
                      <b className="block">{formatarReais(p.precoCentavos)}</b>
                      {p.precoLiquidoCentavos !== null && <span className="text-xs font-semibold text-rio-esc">retornável {formatarReais(p.precoLiquidoCentavos)}</span>}
                    </div>
                    <span className="flex size-9 flex-none items-center justify-center rounded-full bg-verde text-xl font-bold text-white" aria-label={`Adicionar ${p.nome}`}>
                      +
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
