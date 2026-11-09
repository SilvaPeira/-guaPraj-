import type { Metadata } from "next";
import { exigirCliente } from "@/lib/cliente";
import { Topo } from "@/components/ui";
import Simulador from "./Simulador";

export const metadata: Metadata = { title: "Consumo da família" };

export default async function PaginaSimulador() {
  const { usuario } = await exigirCliente();
  return (
    <>
      <Topo titulo="Quantos galões vocês precisam?" subtitulo="Passo 1 de 3" voltar="/inicio" />
      <main className="conteudo">
        <Simulador inicial={usuario.perfilFamilia ?? null} />
      </main>
    </>
  );
}
