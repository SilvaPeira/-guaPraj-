import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { avisarLojaPagamento } from "@/lib/avisos";
import { modoPagamento, podePagarOnline, registrarPago } from "@/lib/mercadopago";
import { formatarReais } from "@/lib/validacao";
import { Topo } from "@/components/ui";

// Só em desenvolvimento (sem credenciais do Mercado Pago): imita a tela de pagamento.
export const metadata: Metadata = { title: "Pagamento de teste" };

async function pedidoDoCliente(id: string) {
  if (modoPagamento() !== "simulado" || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { usuario, db } = await exigirCliente();
  const [p] = await db
    .select()
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.id, id), eq(schema.pedidos.clienteId, usuario.id)))
    .limit(1);
  if (!p) notFound();
  return { p, db };
}

async function responder(form: FormData) {
  "use server";
  const id = String(form.get("pedidoId"));
  const { p, db } = await pedidoDoCliente(id);
  const r = String(form.get("resultado"));
  if (r === "pix" || r === "cartao") {
    if (await registrarPago(p.id, `sim-${Date.now()}`, r)) await avisarLojaPagamento(p.id);
  } else if (p.statusPagamento === "pendente") {
    await db.update(schema.pedidos).set({ statusPagamento: "falhou" }).where(eq(schema.pedidos.id, p.id));
  }
  redirect(`/pedidos/${p.id}?pagamento=retorno`);
}

export default async function PagamentoSimulado({ params }: PageProps<"/pagamento-simulado/[id]">) {
  const { id } = await params;
  const { p } = await pedidoDoCliente(id);
  if (!podePagarOnline(p)) redirect(`/pedidos/${p.id}`);
  return (
    <>
      <Topo titulo="Pagamento de teste" subtitulo={`Pedido #${p.numero}`} voltar={`/pedidos/${p.id}`} />
      <main className="conteudo">
        <p className="aviso-info text-sm">
          Modo de teste: o Mercado Pago ainda não está ligado neste servidor. Em produção, aqui abre o checkout do Mercado Pago com Pix e cartão.
        </p>
        <section className="cartao-elevado pilha text-center">
          <span className="text-sm text-tinta-suave">Valor</span>
          <b className="font-titulo text-[32px]">{formatarReais(p.totalCentavos)}</b>
        </section>
        <form action={responder} className="pilha">
          <input type="hidden" name="pedidoId" value={p.id} />
          <button className="botao" name="resultado" value="pix">
            Simular Pix aprovado
          </button>
          <button className="botao-sec" name="resultado" value="cartao">
            Simular cartão aprovado
          </button>
          <button className="botao-peq-perigo" name="resultado" value="recusado">
            Simular pagamento recusado
          </button>
        </form>
      </main>
    </>
  );
}
