import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { marcaAtual } from "@/lib/marca";
import { garantirContrasteComBranco, variaveisTema } from "@/lib/cores";
import RegistrarSW from "@/components/RegistrarSW";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"] });

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
    appleWebApp: { capable: true, title: m.nome, statusBarStyle: "default" },
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
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full" style={m ? (variaveisTema(m.corPrimaria, m.corEscura) as React.CSSProperties) : undefined} suppressHydrationWarning>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
