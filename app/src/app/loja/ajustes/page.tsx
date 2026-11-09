import type { Metadata } from "next";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { sair } from "@/app/entrar/actions";
import FormAjustes from "./FormAjustes";

export const metadata: Metadata = { title: "Ajustes da loja" };

export default async function Ajustes() {
  const { loja } = await exigirLoja();
  return (
    <>
      <Topo
        titulo="Ajustes"
        subtitulo={loja.nome}
        acao={
          <form action={sair}>
            <button className="link-texto">Sair</button>
          </form>
        }
      />
      <main className="conteudo">
        <FormAjustes
          fazEntrega={loja.fazEntrega}
          fazRetirada={loja.fazRetirada}
          raioKm={loja.raioKm}
          taxaEntregaCentavos={loja.taxaEntregaCentavos}
          vendeAlcool={loja.vendeAlcool}
          regras={loja.regrasHorario}
        />
      </main>
    </>
  );
}
