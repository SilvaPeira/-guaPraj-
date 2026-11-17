import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { slugLivre } from "@/lib/marca";
import { Topo } from "@/components/ui";
import FormMarca from "./FormMarca";
import BotaoCopiar from "./BotaoCopiar";

export const metadata: Metadata = { title: "Meu app" };

export default async function MeuApp() {
  const { loja, db } = await exigirLoja();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "aguapraja.com.br";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  // Lojas cadastradas antes do “Meu app” ganham o endereço na primeira visita.
  if (!loja.slug) {
    loja.slug = await slugLivre(loja.nome, loja.id);
    await db.update(schema.lojas).set({ slug: loja.slug }).where(eq(schema.lojas.id, loja.id));
  }
  const slug = loja.slug;
  const link = `${base}/l/${slug}`;
  const msg = `Agora você pode pedir água e bebidas da ${loja.nome} pelo nosso app: ${link}`;

  return (
    <>
      <Topo titulo="Meu app" subtitulo="Seu site com a cara da sua loja" />
      <main className="conteudo">
        <section className="cartao-elevado pilha">
          <b>Seu link</b>
          {loja.slug ? (
            <>
              <p className="break-all font-semibold text-verde">{link}</p>
              <div className="flex flex-wrap gap-2">
                <BotaoCopiar texto={link} />
                <a className="botao-peq-sec" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
                  Mandar no WhatsApp
                </a>
                <Link className="botao-peq-sec" href={`/l/${loja.slug}`} target="_blank">
                  Abrir
                </Link>
              </div>
              {loja.status !== "aprovada" && <p className="text-sm text-terra-esc">Os clientes só conseguem abrir depois que a loja for aprovada. Você já pode ver a prévia.</p>}
            </>
          ) : (
            <p className="text-sm text-tinta-suave">Salve abaixo para criar o seu link.</p>
          )}
          <details>
            <summary className="link-texto cursor-pointer list-none">Como o cliente instala o app</summary>
            <ul className="mt-2 list-disc pl-5 text-sm text-tinta-suave">
              <li>
                <b>Android:</b> abre o link no Chrome e toca em “Instalar o app {loja.nome}” (ou no menu ⋮ → “Instalar app”).
              </li>
              <li>
                <b>iPhone:</b> abre no Safari, toca em Compartilhar → “Adicionar à Tela de Início”.
              </li>
              <li>Não precisa de Play Store nem App Store. O ícone e o nome que aparecem no celular são os da sua loja.</li>
            </ul>
          </details>
        </section>

        <FormMarca
          nome={loja.nome}
          slugInicial={slug}
          descricao={loja.descricao}
          corPrimaria={loja.corPrimaria}
          corEscura={loja.corEscura}
          logoUrl={loja.logo && loja.slug ? `/l/${loja.slug}/logo?v=${loja.logo.length}` : null}
          capaUrl={loja.capa && loja.slug ? `/l/${loja.slug}/capa?v=${loja.capa.length}` : null}
          personalizacao={loja.personalizacao ?? {}}
          baseUrl={base}
        />
      </main>
    </>
  );
}
