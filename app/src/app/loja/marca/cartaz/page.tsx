import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { exigirLoja } from "@/lib/loja";
import { recursosDaLoja } from "@/lib/planos-app";
import { linkBonito, linkDoApp, qrSvg } from "@/lib/qr";
import { garantirContrasteComBranco } from "@/lib/cores";
import BotaoImprimir from "./BotaoImprimir";

export const metadata: Metadata = { title: "Cartaz do app" };

/** Cartaz A4 com o QR code do app da loja: imprimir e colar na parede, no balcão ou no caminhão. */
export default async function Cartaz() {
  const { loja } = await exigirLoja();
  const { appProprio } = await recursosDaLoja(loja.id);
  if (!appProprio || !loja.slug) {
    return (
      <main className="conteudo">
        <p className="aviso-info">O cartaz com QR code vem junto com o app próprio (plano Completo).</p>
        <Link href="/loja/plano" className="botao">
          Ver planos
        </Link>
      </main>
    );
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const base = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const link = linkDoApp(loja.slug, base);
  const cor = garantirContrasteComBranco(loja.corEscura);
  const qr = await qrSvg(link, cor);

  return (
    <main className="cartaz mx-auto flex max-w-[210mm] flex-col items-center gap-6 bg-white px-6 py-8 text-center print:p-0">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/loja/marca" className="link-texto">
          ← Voltar
        </Link>
        <BotaoImprimir />
      </div>

      <div className="flex w-full flex-col items-center gap-5 rounded-3xl border-4 p-8" style={{ borderColor: cor }}>
        {loja.logo && loja.slug ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/l/${loja.slug}/logo`} alt="" className="h-24 w-auto object-contain" />
        ) : null}
        <h1 className="font-titulo text-4xl font-extrabold leading-tight" style={{ color: cor }}>
          {loja.nome}
        </h1>
        <p className="text-2xl font-bold">Peça água e bebidas pelo nosso app</p>
        <div className="w-[80mm] max-w-full rounded-2xl bg-white p-2" role="img" aria-label={`QR code do app da ${loja.nome}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="text-xl">
          Aponte a <b>câmera do celular</b> para o código
        </p>
        <ol className="grid w-full max-w-md gap-2 text-left text-lg">
          <li>
            <b>1.</b> Abra o link que aparecer
          </li>
          <li>
            <b>2.</b> Toque em <b>“Instalar o app”</b>
          </li>
          <li>
            <b>3.</b> Escolha o dia e o horário da entrega
          </li>
        </ol>
        <p className="break-all text-lg font-semibold" style={{ color: cor }}>
          {linkBonito(link)}
        </p>
        {loja.telefone && <p className="text-base text-tinta-suave">Dúvidas? WhatsApp ({loja.telefone.slice(0, 2)}) {loja.telefone.slice(2, 7)}-{loja.telefone.slice(7)}</p>}
      </div>
      <p className="text-xs text-tinta-suave print:hidden">Dica: imprima em A4 colorido. O QR code funciona também em preto e branco.</p>
    </main>
  );
}
