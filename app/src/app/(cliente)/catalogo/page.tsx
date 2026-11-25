import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { marcaAtual } from "@/lib/marca";
import { lojasQueAtendem } from "@/lib/lojas-proximas";
import { mediasDasLojas, textoNota } from "@/lib/avaliacoes";
import { podeVender } from "@/lib/catalogo";
import { categoriaDo, mapaCategorias } from "@/lib/categorias";
import { ehExtra, recursosDaLoja } from "@/lib/planos-app";
import { formatarKm } from "@/lib/geo";
import { formatarReais } from "@/lib/validacao";
import { Topo, Vazio } from "@/components/ui";
import FotoProduto, { urlFoto } from "@/components/FotoProduto";

export const metadata: Metadata = { title: "Catálogo" };

/** Sem acento e minúsculo, para a busca achar "agua" em "Água". */
const simples = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

type Item = {
  id: string;
  lojaId: string;
  nome: string;
  marca: string | null;
  categoria: string;
  /** Categoria do catálogo (Admin → Categorias). */
  grupoId: string;
  grupo: string;
  precoCentavos: number;
  precoLiquidoCentavos: number | null;
  fotoUrl: string | null;
  alcoolico: boolean;
};


export default async function Catalogo({ searchParams }: PageProps<"/catalogo">) {
  const { usuario, endereco, db } = await exigirCliente();
  const marca = await marcaAtual();
  // No app próprio da loja, o catálogo é o dela.
  if (marca) redirect(`/lojas/${marca.lojaId}`);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";

  const lojas = await lojasQueAtendem(endereco);
  const ids = lojas.map((l) => l.loja.id);
  const [produtos, comLogo, notas, [assinatura]] = await Promise.all([
    ids.length
      ? db.select().from(schema.produtos).where(inArray(schema.produtos.lojaId, ids)).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome))
      : [],
    ids.length
      ? db
          .select({ id: schema.lojas.id })
          .from(schema.lojas)
          .where(and(inArray(schema.lojas.id, ids), isNotNull(schema.lojas.logo), isNotNull(schema.lojas.slug)))
      : [],
    mediasDasLojas(ids),
    db
      .select({ id: schema.assinaturas.id, lojaId: schema.assinaturas.lojaId })
      .from(schema.assinaturas)
      .where(and(eq(schema.assinaturas.clienteId, usuario.id), inArray(schema.assinaturas.status, ["ativa", "pausada"])))
      .limit(1),
  ]);
  const mapa = await mapaCategorias();
  const grupo = typeof sp.g === "string" && mapa.porId.has(sp.g) ? sp.g : "";
  const extrasLiberados = new Map(await Promise.all(ids.map(async (id) => [id, (await recursosDaLoja(id)).produtosExtras] as const)));
  const logos = new Set(comLogo.map((l) => l.id));

  const itens: Item[] = produtos
    .filter((p) => {
      const loja = lojas.find((l) => l.loja.id === p.lojaId)!.loja;
      return podeVender(p) && p.categoria !== "casco" && (!p.alcoolico || loja.vendeAlcool) && (extrasLiberados.get(p.lojaId) || !ehExtra(p.categoria));
    })
    .map((p) => ({
      id: p.id,
      lojaId: p.lojaId,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria,
      grupoId: categoriaDo(p, mapa).id,
      grupo: categoriaDo(p, mapa).nome,
      precoCentavos: p.precoCentavos,
      precoLiquidoCentavos: p.precoLiquidoCentavos,
      fotoUrl: urlFoto(p),
      alcoolico: p.alcoolico,
    }));
  // Botões de categoria: só as que têm produto à venda, na ordem do painel.
  const gruposComItens = mapa.lista.filter((c) => c.tipo !== "casco" && itens.some((i) => i.grupoId === c.id));
  const buscando = !!q || !!grupo;
  const termos = simples(q).split(/\s+/).filter(Boolean);
  const achados = buscando
    ? itens
        .filter((i) => (!grupo || i.grupoId === grupo) && termos.every((t) => simples(`${i.nome} ${i.marca ?? ""} ${i.grupo}`).includes(t)))
        .sort((a, b) => a.precoCentavos - b.precoCentavos)
    : [];
  /** Na loja do plano, o pedido vira compra adicional (galão pelo preço do plano). */
  const linkPedido = (lojaId: string, itemId?: string) => {
    const u = new URLSearchParams();
    if (itemId) u.set("item", itemId);
    if (assinatura?.lojaId === lojaId) u.set("assinatura", assinatura.id);
    return u.size ? `/pedir/${lojaId}?${u}` : `/pedir/${lojaId}`;
  };
  const hrefItem = (i: Item) => linkPedido(i.lojaId, i.categoria === "agua_galao" ? undefined : i.id);
  const nomeLoja = (id: string) => lojas.find((l) => l.loja.id === id)?.loja.nome ?? "";
  const lojaAssinada = assinatura ? lojas.find((l) => l.loja.id === assinatura.lojaId) : undefined;
  const hrefGrupo = (g: string) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (g) u.set("g", g);
    return u.size ? `/catalogo?${u}` : "/catalogo";
  };

  return (
    <>
      <Topo titulo="Catálogo" subtitulo={`Distribuidoras que atendem ${endereco.bairro}`} />
      <main className="conteudo">
        <form action="/catalogo" className="flex gap-2" role="search">
          {grupo && <input type="hidden" name="g" value={grupo} />}
          <label className="sr-only" htmlFor="busca">
            Buscar produto
          </label>
          <input id="busca" name="q" type="search" defaultValue={q} placeholder="Buscar: água, coca, gelo, cerveja…" className="entrada min-w-0 flex-1" />
          <button className="botao-peq">Buscar</button>
        </form>

        {gruposComItens.length > 1 && (
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Categorias">
            {[{ id: "", nome: "Tudo" }, ...gruposComItens].map((g) => (
              <Link
                key={g.id || "todos"}
                href={hrefGrupo(g.id)}
                aria-current={grupo === g.id ? "page" : undefined}
                className={`flex min-h-10 flex-none items-center rounded-full border px-3.5 text-sm font-semibold ${grupo === g.id ? "border-verde bg-verde text-white" : "border-borda2 bg-white"}`}
              >
                {g.nome}
              </Link>
            ))}
          </nav>
        )}

        {lojaAssinada && !buscando && (
          <p className="aviso-info text-sm">
            Seu plano mensal é com a <b>{lojaAssinada.loja.nome}</b>. Aqui você pode fazer pedidos avulsos em qualquer distribuidora.{" "}
            <Link href="/assinatura" className="link-texto">
              Ver meu plano
            </Link>
          </p>
        )}

        {lojas.length === 0 && (
          <Vazio>
            <b className="block text-tinta">Ainda não temos distribuidora atendendo {endereco.bairro}.</b>
            <span className="text-sm">Estamos chamando as lojas da cidade. Avisamos você assim que alguma começar.</span>
          </Vazio>
        )}

        {buscando && (
          <>
            <p className="text-sm text-tinta-suave">
              {achados.length === 0
                ? "Nada encontrado."
                : `${achados.length} ${achados.length === 1 ? "produto" : "produtos"}${q ? ` para “${q}”` : ""}${grupo ? ` em ${mapa.porId.get(grupo)?.nome}` : ""} · do menor preço`}
              {(q || grupo) && (
                <>
                  {" · "}
                  <Link href="/catalogo" className="link-texto">
                    limpar
                  </Link>
                </>
              )}
            </p>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {achados.map((i) => (
                <li key={i.id}>
                  <CartaoProduto item={i} href={hrefItem(i)} loja={nomeLoja(i.lojaId)} />
                </li>
              ))}
            </ul>
          </>
        )}

        {!buscando &&
          lojas.map(({ loja, distanciaKm, entregaAqui }) => {
            const daLoja = itens.filter((i) => i.lojaId === loja.id);
            const nota = textoNota(notas.get(loja.id));
            const assinada = assinatura?.lojaId === loja.id;
            return (
              <section key={loja.id} className={`cartao pilha ${assinada ? "border-2 border-acai" : ""}`}>
                <Link href={`/lojas/${loja.id}`} className="flex items-center gap-3">
                  {logos.has(loja.id) && loja.slug ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/l/${loja.slug}/logo`} alt="" className="size-12 flex-none rounded-full border border-borda bg-white object-contain" />
                  ) : (
                    <span className="flex size-12 flex-none items-center justify-center rounded-full bg-verde font-titulo text-lg font-bold text-white" aria-hidden="true">
                      {loja.nome.replace(/^(distribuidora|dep[oó]sito)\s+/i, "").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[17px] font-bold">{loja.nome}</h2>
                    <p className="text-sm text-tinta-suave">
                      {formatarKm(distanciaKm)}
                      {nota ? ` · ${nota}` : ""}
                      {" · "}
                      {entregaAqui ? (loja.taxaEntregaCentavos ? `entrega ${formatarReais(loja.taxaEntregaCentavos)}` : "entrega grátis") : "só retirada"}
                    </p>
                  </div>
                  {assinada && <span className="selo bg-acai text-white">Seu plano</span>}
                </Link>
                {daLoja.length > 0 && (
                  <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1" aria-label={`Produtos de ${loja.nome}`}>
                    {daLoja.slice(0, 12).map((i) => (
                      <li key={i.id} className="w-[132px] flex-none snap-start">
                        <CartaoProduto item={i} href={hrefItem(i)} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/lojas/${loja.id}`} className="botao-peq-sec">
                    Ver loja e planos
                  </Link>
                  <Link href={linkPedido(loja.id)} className="botao-peq">
                    {assinada ? "Compra adicional" : "Fazer pedido"}
                  </Link>
                </div>
              </section>
            );
          })}
      </main>
    </>
  );
}

function CartaoProduto({ item: i, href, loja }: { item: Item; href: string; loja?: string }) {
  return (
    <Link href={href} className="flex h-full flex-col gap-1.5 rounded-[var(--raio-cartao,16px)] border border-borda bg-white p-2 transition hover:border-verde">
      <FotoProduto url={i.fotoUrl} categoria={i.categoria} nome={i.nome} tamanho="cheia" />
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{i.nome}</span>
      {i.marca && <span className="truncate text-xs text-tinta-suave">{i.marca}</span>}
      <span className="mt-auto">
        <b className="block">{formatarReais(i.precoCentavos)}</b>
        {i.precoLiquidoCentavos !== null && <span className="block text-xs font-semibold text-rio-esc">retornável {formatarReais(i.precoLiquidoCentavos)}</span>}
        {i.alcoolico && <span className="selo selo-acai mt-0.5">18+</span>}
        {loja && <span className="block truncate text-xs text-tinta-suave">{loja}</span>}
      </span>
      <span className="flex min-h-9 items-center justify-center rounded-full bg-verde-claro text-sm font-bold text-verde">+ Adicionar</span>
    </Link>
  );
}
