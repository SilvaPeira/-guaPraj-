import type { Metadata } from "next";
import SiteAguaPraja from "@/components/SiteAguaPraja";
import { listarPlanosApp } from "@/lib/planos-app";
import { telefonesAdmin } from "@/lib/destino";

export const metadata: Metadata = {
  title: "ÁguaPrajá — água na sua porta, no dia certo",
  description: "Assine um plano de água com a distribuidora do seu bairro. Para distribuidoras: agenda, assinaturas, Pix e cartão e app com a sua marca.",
};

export default async function Sobre() {
  return <SiteAguaPraja planos={await listarPlanosApp(true)} suporte={telefonesAdmin()[0] ?? null} />;
}
