import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/sessao";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Entregas" };

export default async function Entregas() {
  await exigirUsuario(["entregador"]);
  return (
    <>
      <Topo titulo="Entregas de hoje" />
      <main className="conteudo">
        <Vazio>A tela do entregador chega na etapa 5.</Vazio>
      </main>
    </>
  );
}
