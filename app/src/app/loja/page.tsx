import type { Metadata } from "next";
import Link from "next/link";
import { exigirLoja } from "@/lib/loja";
import { agendaDoDia, garantirEntregasDaLoja, pendentesAtrasados } from "@/lib/operacao";
import { paraCartao } from "@/lib/cartao-pedido";
import { agoraLocal, dataBonita, somarDias } from "@/lib/tempo";
import { formatarReais } from "@/lib/validacao";
import { Hero, Logo } from "@/components/ui";
import AgendaLoja from "@/components/AgendaLoja";
import { sair } from "../entrar/actions";

export const metadata: Metadata = { title: "Agenda" };

export default async function PainelLoja({ searchParams }: PageProps<"/loja">) {
  const { loja, db } = await exigirLoja();
  const sp = await searchParams;
  const hoje = agoraLocal().data;
  const data = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hoje;
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i));

  if (loja.status === "aprovada") await garantirEntregasDaLoja(db, loja.id, data);
  const pedidos = loja.status === "aprovada" ? (await agendaDoDia(db, loja.id, data)).map(paraCartao) : [];
  const atrasados = loja.status === "aprovada" ? await pendentesAtrasados(db, loja.id) : [];
  const ativos = pedidos.filter((p) => !["cancelado", "nao_entregue"].includes(p.status));
  const resumo = {
    entregas: ativos.filter((p) => p.modo === "entrega").length,
    retiradas: ativos.filter((p) => p.modo === "retirada").length,
    galoes: ativos.reduce((s, p) => s + p.galoes, 0),
    receber: ativos.filter((p) => p.statusPagamento !== "pago").reduce((s, p) => s + p.totalCentavos, 0),
    aConfirmar: pedidos.filter((p) => p.status === "recebido").length,
  };

  return (
    <>
      <Hero>
        <div className="flex items-center justify-between">
          <Logo />
          <form action={sair}>
            <button className="min-h-11 text-sm font-semibold text-hero-texto underline">Sair</button>
          </form>
        </div>
        <p className="mt-5 text-sm text-hero-texto">
          {loja.cidade} · {loja.bairro}
        </p>
        <h1 className="text-[26px] font-bold">{loja.nome}</h1>
      </Hero>
      <main className="conteudo -mt-10">
        {loja.status === "pendente" && (
          <div className="cartao-elevado pilha">
            <span className="selo selo-terra self-start">Em análise</span>
            <b className="font-titulo text-lg">Recebemos seu cadastro!</b>
            <p className="text-sm text-tinta-suave">
              Vamos conferir os dados e o selo fiscal da água e te chamar no WhatsApp. Enquanto isso, monte seu catálogo, seus planos e a cara do seu
              app.
            </p>
          </div>
        )}
        {loja.status === "suspensa" && (
          <div className="cartao-elevado pilha">
            <span className="selo selo-terra self-start">Suspensa</span>
            <p className="text-sm text-tinta-suave">{loja.observacaoAdmin ?? "Fale com o suporte do ÁguaPrajá."}</p>
          </div>
        )}

        {loja.status === "aprovada" && (
          <>
            <nav className="cartao-elevado -mx-0 flex gap-2 overflow-x-auto p-2" aria-label="Dia da agenda">
              {dias.map((d) => (
                <Link
                  key={d}
                  href={d === hoje ? "/loja" : `/loja?data=${d}`}
                  aria-current={d === data ? "page" : undefined}
                  className={`flex min-h-11 flex-none items-center rounded-[var(--raio-chip,9999px)] border px-3.5 text-sm font-semibold ${d === data ? "border-verde bg-verde text-white" : "border-borda2 bg-white"}`}
                >
                  {dataBonita(d, hoje).replace(" · ", " ")}
                </Link>
              ))}
            </nav>

            {atrasados.length > 0 && (
              <div className="aviso-erro pilha text-sm">
                <b>{atrasados.length} pedido(s) de dias anteriores sem desfecho.</b>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(atrasados.map((a) => a.data))].map((d) => (
                    <Link key={d} href={`/loja?data=${d}`} className="underline">
                      Ver {d.slice(8, 10)}/{d.slice(5, 7)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi valor={String(resumo.entregas)} rotulo="entregas" />
              <Kpi valor={String(resumo.retiradas)} rotulo="retiradas" />
              <Kpi valor={String(resumo.galoes)} rotulo="galões" />
              <Kpi valor={formatarReais(resumo.receber)} rotulo="a receber" />
            </div>
            {resumo.aConfirmar > 0 && <p className="aviso-info text-sm">{resumo.aConfirmar} pedido(s) esperando sua confirmação. Confirme para o cliente ficar tranquilo.</p>}

            <AgendaLoja pedidos={pedidos} ehDono amanha={somarDias(hoje, 1)} />
          </>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Link href="/loja/financeiro" className="cartao flex min-h-16 flex-col justify-center">
            <b className="text-sm">Financeiro</b>
            <span className="text-xs text-tinta-suave">Recebido, pendências, avaliações</span>
          </Link>
          <Link href="/loja/cascos" className="cartao flex min-h-16 flex-col justify-center">
            <b className="text-sm">Cascos</b>
            <span className="text-xs text-tinta-suave">Vasilhames com clientes</span>
          </Link>
          <Link href="/loja/equipe" className="cartao flex min-h-16 flex-col justify-center">
            <b className="text-sm">Entregadores</b>
            <span className="text-xs text-tinta-suave">Quem faz as entregas</span>
          </Link>
        </div>
      </main>
    </>
  );
}

function Kpi({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="cartao p-3">
      <b className="block font-titulo text-xl">{valor}</b>
      <span className="text-xs text-tinta-suave">{rotulo}</span>
    </div>
  );
}
