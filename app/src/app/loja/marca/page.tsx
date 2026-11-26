import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { slugLivre } from "@/lib/marca";
import { recursosDaLoja } from "@/lib/planos-app";
import { Topo } from "@/components/ui";
import FormMarca from "./FormMarca";
import BotaoCopiar from "./BotaoCopiar";
import { linkBonito, linkDoApp, qrSvg } from "@/lib/qr";
import { urlLegivel } from "@/lib/dominio";

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
  const { appProprio } = await recursosDaLoja(loja.id);
  // Link para pessoas: com acento (águaprajá.tech); funciona igual ao formato técnico.
  const link = urlLegivel(`${base}/l/${slug}`);
  const msg = `Agora você pode pedir água e bebidas da ${loja.nome} pelo nosso app: ${link}`;
  // QR code do app (para imprimir e colar na parede/balcão): só com o app próprio no ar.
  const linkPublico = linkDoApp(slug, base);
  const qr = appProprio ? await qrSvg(linkPublico, loja.corEscura) : null;

  return (
    <>
      <Topo titulo="Meu app" subtitulo="Seu site com a cara da sua loja" />
      <main className="conteudo">
        {appProprio && (
          <div className="cartao-elevado pilha border-2 border-verde">
            <b className="text-verde">✓ Seu app está no ar (plano Completo)</b>
            <p className="text-sm text-tinta-suave">Seus clientes abrem o link abaixo e tocam em “Instalar o app”. Funciona no Android, no iPhone e no computador, sem loja de aplicativos.</p>
            <a className="botao-peq self-start" href={`/l/${slug}`} target="_blank" rel="noopener noreferrer">
              Abrir meu app
            </a>
          </div>
        )}
        {!appProprio && (
          <div className="aviso-info pilha text-sm">
            <p>
              <b>O app próprio faz parte do plano Completo.</b> Você já pode deixar tudo pronto aqui (logo, cores, frase). O site e o botão de instalar ficam no ar para os
              clientes quando o plano Completo estiver ativo. Até lá, eles encontram a sua loja dentro do ÁguaPrajá.
            </p>
            <Link href="/loja/plano" className="botao-peq self-start">
              Ver planos
            </Link>
          </div>
        )}
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
              {qr && (
                <div className="mt-1 flex flex-wrap items-center gap-4 rounded-xl bg-fundo p-3">
                  <div
                    className="size-32 flex-none rounded-lg bg-white p-1"
                    role="img"
                    aria-label={`QR code do app da ${loja.nome}`}
                    // SVG gerado no servidor pela biblioteca qrcode (só o link da própria loja).
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <b>QR code do seu app</b>
                    <span className="text-sm text-tinta-suave">
                      O cliente aponta a câmera do celular e já abre {linkBonito(linkPublico)}. Imprima e cole no balcão, na parede ou no caminhão.
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <a className="botao-peq" href="/loja/marca/cartaz" target="_blank" rel="noopener">
                        Imprimir cartaz
                      </a>
                      <a className="botao-peq-sec" href="/loja/marca/qr" download={`qrcode-${slug}.png`}>
                        Baixar QR code
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {!appProprio && <p className="text-sm text-tinta-suave">O QR code para imprimir e colar na parede vem junto com o app próprio (plano Completo).</p>}
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
              <li>
                <b>Computador (Windows):</b> abre o link no Chrome ou no Edge e clica no ícone de instalar na barra de endereço (ou no menu → “Instalar {loja.nome}”). Ele vira um
                programa com ícone na área de trabalho e no menu Iniciar.
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
