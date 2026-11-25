import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import { destinoDoUsuario, telefonesAdmin } from "@/lib/destino";
import { marcaAtual } from "@/lib/marca";
import { listarPlanosApp } from "@/lib/planos-app";
import SiteAguaPraja from "@/components/SiteAguaPraja";
import { lojasDaVitrine } from "@/lib/vitrine";

// Visitante: site do ÁguaPrajá. Logado: vai direto para a sua tela.
// Quem chegou pelo site de uma loja continua no site dela.
export default async function Home() {
  const u = await usuarioAtual();
  if (u) redirect(await destinoDoUsuario(u));
  const m = await marcaAtual();
  if (m) redirect(`/l/${m.slug}`);
  return <SiteAguaPraja planos={await listarPlanosApp(true)} suporte={telefonesAdmin()[0] ?? null} lojas={await lojasDaVitrine()} />;
}
