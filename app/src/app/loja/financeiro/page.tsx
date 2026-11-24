import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { exigirLoja } from "@/lib/loja";
import { marcarComoPago, mesVizinho, resumoDoMes } from "@/lib/financeiro";
import { avaliacoesRecentes, mediasDasLojas, textoNota } from "@/lib/avaliacoes";
import { agoraLocal } from "@/lib/tempo";
import { formatarReais } from "@/lib/validacao";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Financeiro" };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m: string) => {
  const t = `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
  return t[0].toUpperCase() + t.slice(1);
};

async function pago(form: FormData) {
  "use server";
  const { loja } = await exigirLoja();
  await marcarComoPago(loja.id, String(form.get("pedidoId")));
  revalidatePath("/loja/financeiro");
  revalidatePath("/loja");
}

export default async function Financeiro({ searchParams }: PageProps<"/loja/financeiro">) {
  const { loja } = await exigirLoja();
  const sp = await searchParams;
  const atual = agoraLocal().data.slice(0, 7);
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : atual;
  const [r, nota, avaliacoes] = await Promise.all([resumoDoMes(loja.id, mes), mediasDasLojas([loja.id]), avaliacoesRecentes(loja.id, 8)]);

  return (
    <>
      <Topo titulo="Financeiro" subtitulo={loja.nome} voltar="/loja" />
      <main className="conteudo">
        <nav className="flex items-center justify-between" aria-label="Mês">
          <Link className="botao-peq-sec" href={`/loja/financeiro?mes=${mesVizinho(mes, -1)}`} aria-label="Mês anterior">
            ‹
          </Link>
          <b className="font-titulo text-lg">{nomeMes(mes)}</b>
          {mes < atual ? (
            <Link className="botao-peq-sec" href={`/loja/financeiro?mes=${mesVizinho(mes, 1)}`} aria-label="Próximo mês">
              ›
            </Link>
          ) : (
            <span className="w-11" />
          )}
        </nav>

        <section className="rounded-[var(--raio-cartao,20px)] bg-floresta p-4 text-white">
          <span className="text-sm text-hero-texto">Recebido no mês</span>
          <b className="block font-titulo text-[32px] leading-tight">{formatarReais(r.recebido)}</b>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <span>
              <span className="block text-hero-texto">Planos</span>
              {formatarReais(r.recebidoPorOrigem.plano)}
            </span>
            <span>
              <span className="block text-hero-texto">Avulsos</span>
              {formatarReais(r.recebidoPorOrigem.avulso)}
            </span>
            <span>
              <span className="block text-hero-texto">Adicionais</span>
              {formatarReais(r.recebidoPorOrigem.extra)}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Kpi valor={formatarReais(r.aReceber)} rotulo="entregue e não pago" destaque={r.aReceber > 0} />
          <Kpi valor={formatarReais(r.previsto)} rotulo="previsto (agendado)" />
          <Kpi valor={String(r.assinantes.ativos)} rotulo={`assinantes ativos${r.assinantes.pausados ? ` · ${r.assinantes.pausados} pausado(s)` : ""}`} />
          <Kpi valor={formatarReais(r.ticketMedio)} rotulo="ticket médio" />
          <Kpi valor={String(r.galoes)} rotulo="galões entregues" />
          <Kpi valor={textoNota(nota.get(loja.id)) ?? "—"} rotulo="avaliação dos clientes" />
        </div>

        <h2 className="titulo-secao mt-2">Para receber</h2>
        {r.pendentes.length === 0 ? (
          <Vazio>Nada pendente: todo pedido entregue está pago. 👍</Vazio>
        ) : (
          <ul className="pilha">
            {r.pendentes.map((p) => (
              <li key={p.id} className="cartao flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b>{formatarReais(p.total)}</b>
                  <p className="text-sm text-tinta-suave">
                    {p.cliente ?? "Cliente"} · #{p.numero} · {p.data.slice(8, 10)}/{p.data.slice(5, 7)} ·{" "}
                    <a className="text-verde underline" href={linkWhatsApp(p.telefone, `Olá! Ficou em aberto o pagamento do pedido #${p.numero} (${formatarReais(p.total)}).`)} target="_blank" rel="noopener noreferrer">
                      {formatarTelefone(p.telefone)}
                    </a>
                  </p>
                </div>
                <form action={pago}>
                  <input type="hidden" name="pedidoId" value={p.id} />
                  <button className="botao-peq">Recebi</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <h2 className="titulo-secao mt-2">Avaliações recentes</h2>
        {avaliacoes.length === 0 ? (
          <Vazio>Ainda sem avaliações. Elas aparecem depois que os clientes recebem os pedidos.</Vazio>
        ) : (
          <ul className="cartao divide-y divide-borda py-1">
            {avaliacoes.map((a) => (
              <li key={a.numero} className="py-2.5 text-sm">
                <span style={{ color: "#f2a65a" }}>{"★".repeat(a.nota ?? 0)}</span>
                <span className="text-tinta-suave">
                  {" "}
                  · {a.cliente ?? "Cliente"} · #{a.numero}
                </span>
                {a.comentario && <p>“{a.comentario}”</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-tinta-suave">
          Valores pagos na entrega são marcados pelo entregador ou aqui em “Recebi”. Quando o pagamento pelo app chegar, isso passa a ser automático.
        </p>
      </main>
    </>
  );
}

function Kpi({ valor, rotulo, destaque = false }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`cartao p-3 ${destaque ? "border-2 border-terra" : ""}`}>
      <b className="block font-titulo text-lg">{valor}</b>
      <span className="text-xs text-tinta-suave">{rotulo}</span>
    </div>
  );
}
