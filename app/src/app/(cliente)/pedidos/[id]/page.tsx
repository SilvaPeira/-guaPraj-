import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { descreverHorario } from "@/lib/agenda";
import { agoraLocal, dataBonita } from "@/lib/tempo";
import { COR_STATUS, ORIGEM, ROTULO_STATUS } from "@/lib/status";
import { formatarReais } from "@/lib/validacao";
import { textoMeio } from "@/lib/pedidos";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { Topo } from "@/components/ui";
import AvaliarPedido from "@/components/AvaliarPedido";
import { cancelarPedido } from "../../assinatura/actions";
import { pagarAgora } from "./actions";
import { aceitaOnline, podePagarOnline } from "@/lib/mercadopago";

export const metadata: Metadata = { title: "Pedido" };

const PASSOS_ENTREGA = ["recebido", "confirmado", "saiu", "entregue"] as const;
const PASSOS_RETIRADA = ["recebido", "confirmado", "pronto_retirada", "retirado"] as const;

export default async function Pedido({ params, searchParams }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { usuario, db } = await exigirCliente();
  const [linha] = await db
    .select({ p: schema.pedidos, loja: schema.lojas })
    .from(schema.pedidos)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.pedidos.lojaId))
    .where(and(eq(schema.pedidos.id, id), eq(schema.pedidos.clienteId, usuario.id)))
    .limit(1);
  if (!linha) notFound();
  const { p, loja } = linha;
  const [itens, eventos] = await Promise.all([
    db.select().from(schema.itensPedido).where(eq(schema.itensPedido.pedidoId, p.id)),
    db.select().from(schema.eventosPedido).where(eq(schema.eventosPedido.pedidoId, p.id)).orderBy(asc(schema.eventosPedido.criadoEm)),
  ]);
  const hoje = agoraLocal().data;
  const podePagar = podePagarOnline(p) && (await aceitaOnline(loja.id));
  const rotuloPagamento =
    p.statusPagamento === "pago"
      ? p.pagamentoMeio
        ? `Pago pelo app (${p.pagamentoMeio === "pix" ? "Pix" : "cartão"})`
        : "Pago"
      : p.statusPagamento === "estornado"
        ? "Devolvido"
        : p.status === "cancelado" || p.status === "nao_entregue"
          ? "Total"
          : p.formaPagamento === "online"
            ? "A pagar"
            : p.modo === "entrega"
            ? "A pagar na entrega"
            : "A pagar na retirada";
  const meio = textoMeio(p);
  const passos = p.modo === "entrega" ? PASSOS_ENTREGA : PASSOS_RETIRADA;
  const atual = (passos as readonly string[]).indexOf(p.status);
  const horaEvento = (s: string) => {
    const e = eventos.filter((x) => x.status === s).at(-1);
    return e ? e.criadoEm.toLocaleTimeString("pt-BR", { timeZone: "America/Belem", hour: "2-digit", minute: "2-digit" }) : null;
  };

  return (
    <>
      <Topo titulo={`Pedido #${p.numero}`} subtitulo={`${ORIGEM[p.origem]} · ${loja.nome}`} voltar="/pedidos" />
      <main className="conteudo">
        {sp.novo && <p className="aviso-ok">Pedido enviado! A loja já recebeu e vai confirmar.</p>}
        {sp.pagamento === "retorno" && p.statusPagamento === "pago" && <p className="aviso-ok">Pagamento confirmado. Obrigado!</p>}
        {sp.pagamento === "retorno" && p.statusPagamento === "falhou" && <p className="aviso-erro">O pagamento não foi aprovado. Tente de novo ou pague na entrega.</p>}
        {sp.pagamento === "retorno" && p.statusPagamento === "pendente" && (
          <p className="aviso-info">Estamos confirmando o seu pagamento com o Mercado Pago. Pix costuma cair em segundos — atualize a página daqui a pouco.</p>
        )}
        {sp.pagamento === "falhou" && <p className="aviso-erro">Não conseguimos abrir o pagamento agora. Tente de novo abaixo ou pague na entrega.</p>}

        <section className="cartao-elevado pilha">
          <div className="flex items-start justify-between gap-2">
            <div>
              <b className="font-titulo text-lg">{dataBonita(p.data, hoje)}</b>
              <p className="text-sm text-tinta-suave">
                {p.modo === "entrega" ? "Entrega" : "Retirada"} {descreverHorario(p.tipoHorario, p.horaInicio, p.horaFim)}
              </p>
            </div>
            <span className={`selo ${COR_STATUS[p.status]}`}>{ROTULO_STATUS[p.status]}</span>
          </div>
          {p.codigoRetirada && (
            <p className="aviso-info">
              Código de retirada: <b className="font-titulo text-xl tracking-widest">{p.codigoRetirada}</b>
            </p>
          )}
          {p.status === "cancelado" || p.status === "nao_entregue" ? (
            <p className="aviso-erro text-sm">{p.motivo ?? ROTULO_STATUS[p.status]}</p>
          ) : (
            <ol className="flex flex-col gap-0">
              {passos.map((s, i) => {
                const feito = i <= atual;
                const hora = horaEvento(s);
                return (
                  <li key={s} className="flex items-start gap-3">
                    <span className="flex flex-col items-center">
                      <span className={`mt-1 h-4 w-4 rounded-full border-2 ${feito ? "border-verde bg-verde" : "border-borda2 bg-white"}`} aria-hidden="true" />
                      {i < passos.length - 1 && <span className={`h-7 w-0.5 ${i < atual ? "bg-verde" : "bg-borda2"}`} aria-hidden="true" />}
                    </span>
                    <span className={`text-sm ${feito ? "font-semibold" : "text-tinta-suave"}`}>
                      {ROTULO_STATUS[s]}
                      {feito && hora ? ` · ${hora}` : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="cartao pilha">
          <h2 className="titulo-secao">Itens</h2>
          <ul className="divide-y divide-borda">
            {itens.map((it) => (
              <li key={it.id} className="flex justify-between gap-2 py-2 text-sm">
                <span>
                  {it.qtd}× {it.nome}
                  {it.alcoolico && <span className="selo selo-acai ml-1">18+</span>}
                </span>
                <b>{it.precoUnitCentavos ? formatarReais(it.precoUnitCentavos * it.qtd) : "no plano"}</b>
              </li>
            ))}
            {itens
              .filter((it) => it.cascosFaltaram > 0 && it.precoCheioCentavos !== null)
              .map((it) => (
                <li key={`casco-${it.id}`} className="flex justify-between gap-2 py-2 text-sm">
                  <span>{it.cascosFaltaram}× casco não entregue ({it.nome.replace(/ \(retornável\)$/, "")})</span>
                  <b>{formatarReais(it.cascosFaltaram * (it.precoCheioCentavos! - it.precoUnitCentavos))}</b>
                </li>
              ))}
          </ul>
          {itens.some((it) => it.trocaCasco) && !["entregue", "retirado", "cancelado", "nao_entregue"].includes(p.status) && (
            <p className="aviso-info text-sm">
              Retornável: {p.modo === "entrega" ? "entregue" : "leve"} {itens.filter((it) => it.trocaCasco).reduce((t, it) => t + it.qtd, 0)} casco(s) vazio(s) de bebida no
              momento {p.modo === "entrega" ? "da entrega" : "da retirada"}. Sem o casco, você paga o preço normal.
            </p>
          )}
          {p.cascosTroca > 0 && <p className="text-sm text-tinta-suave">Deixe {p.cascosTroca} casco(s) vazio(s) para troca.</p>}
          {p.temAlcool && <p className="text-sm text-terra-esc">Tenha um documento com foto para receber a bebida alcoólica.</p>}
          {p.taxaEntregaCentavos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-tinta-suave">Entrega</span>
              <b>{formatarReais(p.taxaEntregaCentavos)}</b>
            </div>
          )}
          {p.taxaHorarioCentavos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-tinta-suave">Horário especial</span>
              <b>{formatarReais(p.taxaHorarioCentavos)}</b>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-borda pt-2">
            <b>
              {p.totalCentavos === 0 ? "Total" : rotuloPagamento}
              {p.totalCentavos > 0 && meio && p.statusPagamento !== "pago" ? <span className="block text-sm font-normal text-tinta-suave">{meio}</span> : null}
            </b>
            <b className="font-titulo text-xl">{p.totalCentavos > 0 ? formatarReais(p.totalCentavos) : "incluído no plano"}</b>
          </div>
        </section>

        {podePagar && (
          <form action={pagarAgora} className="pilha">
            <input type="hidden" name="pedidoId" value={p.id} />
            <button className="botao">Pagar agora com Pix ou cartão · {formatarReais(p.totalCentavos)}</button>
            {p.statusPagamento === "falhou" && sp.pagamento !== "retorno" && <p className="text-center text-sm text-terra-esc">O último pagamento não foi aprovado. Tente de novo.</p>}
          </form>
        )}
        {p.statusPagamento === "estornado" && <p className="aviso-info text-sm">O valor pago foi devolvido para você pelo Mercado Pago.</p>}

        {(p.status === "entregue" || p.status === "retirado") &&
          (p.nota ? (
            <p className="cartao text-sm">
              Sua avaliação: <span style={{ color: "#f2a65a" }}>{"★".repeat(p.nota)}</span>
              {p.comentario ? ` · “${p.comentario}”` : ""}
            </p>
          ) : (
            <AvaliarPedido pedidoId={p.id} />
          ))}
        <a className="botao-sec" href={linkWhatsApp(loja.telefone, `Olá! Sobre o meu pedido #${p.numero} no ÁguaPrajá.`)} target="_blank" rel="noopener noreferrer">
          Falar com a loja no WhatsApp · {formatarTelefone(loja.telefone)}
        </a>
        {p.status === "recebido" && p.origem !== "plano" && (
          <form action={cancelarPedido}>
            <input type="hidden" name="pedidoId" value={p.id} />
            <button className="botao-peq-perigo w-full">Cancelar pedido</button>
          </form>
        )}
        {p.origem === "plano" && p.status === "recebido" && (
          <p className="text-center text-sm text-tinta-suave">Para pular esta entrega, use “Minha assinatura”.</p>
        )}
      </main>
    </>
  );
}
