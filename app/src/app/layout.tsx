import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Nunito, Oswald, Playfair_Display, Poppins, Sora } from "next/font/google";
import "./globals.css";
import { marcaAtual, temaDaMarca } from "@/lib/marca";
import { garantirContrasteComBranco } from "@/lib/cores";
import RegistrarSW from "@/components/RegistrarSW";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"] });
// Fontes que a loja pode escolher para os títulos (o navegador só baixa a que estiver em uso).
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["600", "700", "800"], preload: false });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["600", "700", "800"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["700", "800"], preload: false });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700", "800"], preload: false });
const fontes = [inter, sora, poppins, montserrat, nunito, oswald, playfair].map((f) => f.variable).join(" ");

// Quando o cliente entrou pelo site/app de uma loja (cookie), o app inteiro
// assume o nome, o ícone e as cores dela. Sem loja, vale a marca ÁguaPrajá.
export async function generateMetadata(): Promise<Metadata> {
  const m = await marcaAtual();
  if (!m) {
    return {
      title: { default: "ÁguaPrajá", template: "%s · ÁguaPrajá" },
      description: "Água em galão por assinatura, com entrega no dia e horário que você escolher.",
      applicationName: "ÁguaPrajá",
    };
  }
  return {
    title: { default: m.nome, template: `%s · ${m.nome}` },
    description: m.descricao ?? `Peça água e bebidas da ${m.nome}.`,
    applicationName: m.nome,
    manifest: `/l/${m.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: m.personalizacao.nomeCurto || m.nome, statusBarStyle: "default" },
    icons: { icon: `/l/${m.slug}/icone/192`, apple: `/l/${m.slug}/icone/180` },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const m = await marcaAtual();
  return { themeColor: m ? garantirContrasteComBranco(m.corEscura) : "#0e3b2c" };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const m = await marcaAtual();
  return (
    <html lang="pt-BR" className={`${fontes} h-full antialiased`}>
      <body className="min-h-full" style={m ? (temaDaMarca(m) as React.CSSProperties) : undefined} suppressHydrationWarning>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
