import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { marcaPorSlug, temaDaMarca } from "@/lib/marca";
import { mediasDasLojas, textoNota } from "@/lib/avaliacoes";
import { garantirContrasteComBranco } from "@/lib/cores";
import { linkWhatsApp } from "@/lib/telefone";
import { usuarioAtual } from "@/lib/sessao";
import { podeVender } from "@/lib/catalogo";
import { agruparPorCategoria, mapaCategorias } from "@/lib/categorias";
import { frequenciaTexto } from "@/lib/simulador";
import { DIAS_CURTOS } from "@/lib/tempo";
import { formatarReais } from "@/lib/validacao";
import { LogoLoja, SeloAguaPraja } from "@/components/marca";
import BotaoInstalar from "@/components/BotaoInstalar";
import FotoProduto, { urlFoto } from "@/components/FotoProduto";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await marcaPorSlug((await params).slug);
  if (!m) return { title: "Loja não encontrada" };
  if (!m.appProprio) return { title: { absolute: m.nome } };
  return {
    title: { absolute: m.nome },
    description: m.descricao ?? `Peça água e bebidas da ${m.nome}, com entrega no dia e horário que você escolher.`,
    manifest: `/l/${m.slug}/manifest.webmanifest`,
    applicationName: m.nome,
    appleWebApp: { capable: true, title: m.nome, statusBarStyle: "default" },
    icons: { icon: `/l/${m.slug}/icone/192`, apple: `/l/${m.slug}/icone/180` },
    openGraph: { title: m.nome, description: m.descricao ?? undefined, images: [`/l/${m.slug}/icone/512`] },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const m = await marcaPorSlug((await params).slug);
  return { themeColor: m ? garantirContrasteComBranco(m.corEscura) : "#0e3b2c" };
}

export default async function SiteDaLoja({ params }: Props) {
  const { slug } = await params;
  const m = await marcaPorSlug(slug);
  if (!m) notFound();
  const u = await usuarioAtual();
  const db = await getDb();
  const [loja] = await db.select().from(schema.lojas).where(eq(schema.lojas.id, m.lojaId)).limit(1);
  const ehDono = u?.id === loja.donoId;
  if (m.status !== "aprovada" && !ehDono && u?.papel !== "admin") notFound();
  // Site/app próprio é do plano Completo: sem ele, o cliente vai para o ÁguaPrajá.
  if (!m.appProprio && !ehDono && u?.papel !== "admin") redirect("/");

  const [planos, produtos] = await Promise.all([
    db.select().from(schema.planos).where(and(eq(schema.planos.lojaId, loja.id), eq(schema.planos.ativo, true))).orderBy(asc(schema.planos.galoesMes)),
    db.select().from(schema.produtos).where(eq(schema.produtos.lojaId, loja.id)).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome)),
  ]);
  const aVenda = produtos.filter(podeVender);
  const galao = aVenda.find((p) => p.categoria === "agua_galao");
  const grupos = agruparPorCategoria(
    aVenda.filter((p) => p.categoria !== "agua_galao" && p.categoria !== "casco"),
    await mapaCategorias(),
  ).map((g) => ({ grupo: g.nome, itens: g.itens }));
  const r = loja.regrasHorario;
  const nota = textoNota((await mediasDasLojas([loja.id])).get(loja.id));
  const p = m.personalizacao ?? {};
  const abrir = (para?: string) => `/l/${m.slug}/abrir${para ? `?para=${para}` : ""}`;

  return (
    <div style={temaDaMarca(m) as React.CSSProperties} className="min-h-screen bg-fundo">
      {!m.appProprio && (
        <p className="bg-terra-claro px-4 py-2 text-center text-sm font-semibold text-terra-esc">
          Prévia: o site e o app da sua loja ficam no ar com o plano Completo.{" "}
          <Link href="/loja/plano" className="underline">
            Ver planos
          </Link>
        </p>
      )}
      {m.status !== "aprovada" && (
        <p className="bg-terra-claro px-4 py-2 text-center text-sm font-semibold text-terra-esc">
          Prévia: o site fica visível para os clientes quando a loja for aprovada.
        </p>
      )}
      <header
        className="bg-floresta bg-cover bg-center pb-16 pt-5 text-white"
        style={
          m.temCapa
            ? { backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--color-floresta) 55%, transparent), var(--color-floresta)), url(/l/${m.slug}/capa)` }
            : undefined
        }
      >
        <div className="mx-auto max-w-xl px-4">
          <LogoLoja marca={m} tamanho={52} />
          <h1 className="mt-6 text-[28px] font-bold leading-tight">{p.titulo || "Água na sua porta, no dia certo."}</h1>
          <p className="mt-2 text-base leading-relaxed text-hero-texto">
            {m.descricao ?? `Assine um plano de água da ${m.nome} ou peça na hora. Bebidas e gelo vão na mesma entrega.`}
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-10 flex w-full max-w-xl flex-col gap-3 px-4">
        <section className="cartao-elevado pilha">
          <div className="flex flex-wrap gap-1.5">
            {loja.fazEntrega && <span className="selo selo-verde">{loja.taxaEntregaCentavos ? `Entrega ${formatarReais(loja.taxaEntregaCentavos)}` : "Entrega grátis"}</span>}
            {loja.fazRetirada && <span className="selo selo-rio">Retirada no balcão</span>}
            {loja.seloFiscalDeclarado && <span className="selo selo-terra">Água com selo fiscal</span>}
            {loja.vendeAlcool && <span className="selo selo-acai">Bebidas (18+)</span>}
          </div>
          <p className="text-sm text-tinta-suave">
            {nota ? <b className="mr-1 text-tinta">{nota} ·</b> : null}
            {loja.bairro}, {loja.cidade} · {r.dias.slice().sort().map((d) => DIAS_CURTOS[d]).join(", ")} · {r.abre}–{r.fecha}
          </p>
          {galao && (
            <p className="text-sm">
              Galão 20 L: <b>{formatarReais(galao.precoCentavos)}</b>
              {galao.marca ? ` · ${galao.marca}` : ""}
            </p>
          )}
          <Link href={abrir(planos.length ? "planos" : "pedir")} className="botao">
            {planos.length ? "Assinar um plano" : "Fazer meu pedido"}
          </Link>
          {planos.length > 0 && (
            <Link href={abrir("pedir")} className="botao-sec">
              Pedir agora, sem plano
            </Link>
          )}
          {!u && (
            <Link href={abrir("entrar")} className="link-texto self-center">
              Já sou cliente: entrar
            </Link>
          )}
        </section>

        <BotaoInstalar nome={p.nomeCurto || m.nome} />

        {(p.instagram || p.mostrarWhatsapp !== false) && (
          <div className="grid grid-cols-2 gap-2">
            {p.mostrarWhatsapp !== false && (
              <a className="botao-sec" href={linkWhatsApp(loja.telefone, `Olá, ${m.nome}!`)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
            {p.instagram && (
              <a className="botao-sec" href={`https://instagram.com/${p.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            )}
          </div>
        )}

        {planos.length > 0 && (
          <section className="pilha">
            <h2 className="titulo-secao mt-1">Planos mensais</h2>
            {planos.map((p) => (
              <Link key={p.id} href={abrir("planos")} className="flex items-center justify-between gap-2 rounded-[var(--raio-cartao,18px)] border border-borda2 bg-white p-3.5">
                <span>
                  <b className="block">
                    {p.galoesMes} {p.galoesMes === 1 ? "galão" : "galões"}/mês
                  </b>
                  <span className="text-sm text-tinta-suave">{frequenciaTexto(p.galoesMes)}</span>
                </span>
                <b>{formatarReais(p.precoCentavos)}</b>
              </Link>
            ))}
          </section>
        )}

        {grupos.map(({ grupo, itens }) => (
          <section key={grupo} className="cartao">
            <h2 className="mb-1 font-bold">{grupo}</h2>
            <ul className="divide-y divide-borda">
              {itens.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <FotoProduto url={urlFoto(p)} categoria={p.categoria} nome={p.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{p.nome}</span>
                    <span className="text-sm text-tinta-suave">
                      {p.marca ?? ""}
                      {p.alcoolico && <span className="selo selo-acai ml-1">18+</span>}
                    </span>
                  </span>
                  <span className="flex-none text-right">
                    <b className="block">{formatarReais(p.precoCentavos)}</b>
                    {p.precoLiquidoCentavos !== null && <span className="text-xs text-tinta-suave">retornável {formatarReais(p.precoLiquidoCentavos)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SeloAguaPraja />
    </div>
  );
}
