import type { Metadata } from "next";
import { agendaDoDia, exigirOperador, garantirEntregasDaLoja } from "@/lib/operacao";
import { paraCartao } from "@/lib/cartao-pedido";
import { agoraLocal, dataBonita, somarDias } from "@/lib/tempo";
import { Topo, Vazio } from "@/components/ui";
import AgendaLoja from "@/components/AgendaLoja";
import { sair } from "../entrar/actions";

export const metadata: Metadata = { title: "Entregas" };

// Tela do entregador: só as entregas de hoje que já foram confirmadas pela loja.
export default async function Entregas() {
  const { loja, db, usuario } = await exigirOperador();
  const hoje = agoraLocal().data;
  await garantirEntregasDaLoja(db, loja.id, hoje);
  const pedidos = (await agendaDoDia(db, loja.id, hoje))
    .filter((p) => p.modo === "entrega" && ["confirmado", "separacao", "saiu", "entregue", "nao_entregue"].includes(p.status))
    .map(paraCartao);
  const pendentes = pedidos.filter((p) => ["confirmado", "separacao", "saiu"].includes(p.status)).length;

  return (
    <>
      <Topo
        titulo={`Entregas · ${dataBonita(hoje, hoje)}`}
        subtitulo={`${usuario.nome ?? "Entregador"} · ${loja.nome}`}
        acao={
          <form action={sair}>
            <button className="link-texto">Sair</button>
          </form>
        }
      />
      <main className="conteudo">
        <p className="aviso-info text-sm">
          {pendentes ? `${pendentes} entrega(s) para fazer.` : "Tudo entregue por hoje."} Só aparecem as entregas que a loja já confirmou.
        </p>
        {pedidos.length === 0 ? <Vazio>Nenhuma entrega confirmada para hoje.</Vazio> : <AgendaLoja pedidos={pedidos} ehDono={false} amanha={somarDias(hoje, 1)} />}
      </main>
    </>
  );
}
