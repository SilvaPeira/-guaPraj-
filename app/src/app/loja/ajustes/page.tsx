import type { Metadata } from "next";
import { exigirLoja } from "@/lib/loja";
import { Topo } from "@/components/ui";
import { sair } from "@/app/entrar/actions";
import FormAjustes from "./FormAjustes";
import Link from "next/link";
import { situacaoDaLoja } from "@/lib/planos-app";

export const metadata: Metadata = { title: "Ajustes da loja" };

export default async function Ajustes() {
  const { loja } = await exigirLoja();
  const plano = await situacaoDaLoja(loja.id);
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
        <Link href="/loja/pagamentos" className="cartao flex items-center justify-between gap-2">
          <span>
            <b className="block">Pagamentos: Pix e Mercado Pago</b>
            <span className="text-sm text-tinta-suave">Sua chave Pix para receber na entrega e o pagamento pelo app</span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href="/loja/plano" className="cartao flex items-center justify-between gap-2">
          <span>
            <b className="block">Meu plano ÁguaPrajá</b>
            <span className="text-sm text-tinta-suave">{plano.vigente?.nome ?? "Fase de testes"}{plano.vencido ? " · aguardando pagamento" : ""}</span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
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
