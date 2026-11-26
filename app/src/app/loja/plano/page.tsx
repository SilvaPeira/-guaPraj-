import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { assinantesDaLoja, calcularSituacao, entregadoresDaLoja, listarPlanosApp, textoLimite, type PlanoApp } from "@/lib/planos-app";
import { telefonesAdmin } from "@/lib/destino";
import { formatarReais } from "@/lib/validacao";
import { linkWhatsApp } from "@/lib/telefone";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Meu plano ÁguaPrajá" };

async function escolher(form: FormData) {
  "use server";
  const { loja, db } = await exigirLoja();
  const id = String(form.get("planoId") ?? "");
  const planos = await listarPlanosApp(true);
  const p = planos.find((x) => x.id === id);
  if (!p) return;
  // Plano pago só passa a valer quando o pagamento é registrado pelo ÁguaPrajá.
  await db
    .update(schema.lojas)
    .set({ planoAppId: p.id, ...(p.precoCentavos === 0 ? { planoAppPagoAte: null } : {}) })
    .where(eq(schema.lojas.id, loja.id));
  revalidatePath("/loja/plano");
}

const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export default async function MeuPlano() {
  const { loja } = await exigirLoja();
  const [todos, assinantes, entregadores] = await Promise.all([listarPlanosApp(), assinantesDaLoja(loja.id), entregadoresDaLoja(loja.id)]);
  const s = calcularSituacao(loja, todos);
  const disponiveis = todos.filter((p) => p.ativo);
  const suporte = telefonesAdmin()[0];
  const aguardando = s.escolhido && s.vencido;

  return (
    <>
      <Topo titulo="Meu plano ÁguaPrajá" subtitulo={loja.nome} voltar="/loja/ajustes" />
      <main className="conteudo">
        <section className="cartao-elevado pilha">
          <span className="text-sm text-tinta-suave">Valendo agora</span>
          <b className="font-titulo text-2xl">{s.vigente?.nome ?? (todos.length ? "Básico" : "Sem limites (fase de testes)")}</b>
          {s.gratisAte ? (
            <p className="text-sm">
              <span className="selo selo-verde">Cortesia do ÁguaPrajá</span> Grátis até <b>{dataBr(s.gratisAte)}</b>.
            </p>
          ) : (
            s.vigente && s.vigente.precoCentavos > 0 && s.pagoAte && <p className="text-sm">Pago até {dataBr(s.pagoAte)}.</p>
          )}
          {s.desconto && s.escolhido && s.escolhido.precoCentavos > 0 && (
            <p className="text-sm">
              <span className="selo selo-acai">−{s.desconto.percentual}%</span> Sua mensalidade: <s className="text-tinta-suave">{formatarReais(s.escolhido.precoCentavos)}</s>{" "}
              <b>{formatarReais(s.valorCentavos === 0 && s.gratisAte ? Math.round((s.escolhido.precoCentavos * (100 - s.desconto.percentual)) / 100) : s.valorCentavos)}</b>
              {s.desconto.ate ? ` até ${dataBr(s.desconto.ate)}` : ""}.
            </p>
          )}
          <ul className="text-sm text-tinta-suave">
            <li>
              Assinantes: {assinantes} {s.recursos.limiteAssinantes !== null ? `de ${s.recursos.limiteAssinantes}` : "(ilimitado)"}
            </li>
            <li>
              Entregadores: {entregadores} {s.recursos.limiteEntregadores !== null ? `de ${s.recursos.limiteEntregadores}` : "(ilimitado)"}
            </li>
            <li>Pagamento pelo app (Pix/cartão): {s.recursos.pagamentoOnline ? "sim" : "não"}</li>
            <li>Bebidas e outros produtos além da água: {s.recursos.produtosExtras ? "sim" : "não"}</li>
            <li>App próprio com a sua marca: {s.recursos.appProprio ? "sim" : "não"}</li>
          </ul>
        </section>

        {aguardando && (
          <div className="aviso-info pilha text-sm">
            <p>
              Você escolheu o plano <b>{s.escolhido!.nome}</b> ({formatarReais(s.valorCentavos)}/mês)
              {s.pagoAte ? `, que venceu em ${dataBr(s.pagoAte)}` : ""}. Ele passa a valer assim que o pagamento for confirmado.
            </p>
            {suporte && (
              <a
                className="botao"
                href={linkWhatsApp(suporte, `Olá! Sou da ${loja.nome} e quero pagar o plano ${s.escolhido!.nome} do ÁguaPrajá (${formatarReais(s.valorCentavos)}/mês).`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Combinar o pagamento pelo WhatsApp
              </a>
            )}
          </div>
        )}

        <h2 className="titulo-secao mt-2">Planos</h2>
        {disponiveis.length === 0 ? (
          <Vazio>O ÁguaPrajá ainda está em fase de testes: tudo liberado, sem mensalidade.</Vazio>
        ) : (
          disponiveis.map((p) => <CartaoPlano key={p.id} p={p} atual={s.escolhido?.id === p.id || (!s.escolhido && s.vigente?.id === p.id)} />)
        )}
      </main>
    </>
  );
}

function CartaoPlano({ p, atual }: { p: PlanoApp; atual: boolean }) {
  return (
    <article className={`cartao pilha ${atual ? "border-2 border-verde" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <b className="font-titulo text-xl">{p.nome}</b>
        <b className="font-titulo text-xl">{p.precoCentavos ? `${formatarReais(p.precoCentavos)}/mês` : "Grátis"}</b>
      </div>
      {p.descricao && <p className="text-sm">{p.descricao}</p>}
      <ul className="list-disc pl-5 text-sm text-tinta-suave">
        <li>{textoLimite(p.limiteAssinantes, "assinante", "assinantes")}</li>
        <li>{textoLimite(p.limiteEntregadores, "entregador", "entregadores")}</li>
        <li>{p.pagamentoOnline ? "Cliente paga pelo app (Pix e cartão)" : "Pagamento na entrega"}</li>
        {p.produtosExtras && <li>Bebidas, gelo e polpas no catálogo</li>}
        {p.appProprio && <li>App próprio: site e app instalável com a marca da sua loja</li>}
      </ul>
      {atual ? (
        <span className="selo selo-verde self-start">Seu plano</span>
      ) : (
        <form action={escolher}>
          <input type="hidden" name="planoId" value={p.id} />
          <button className="botao-sec w-full">Escolher {p.nome}</button>
        </form>
      )}
    </article>
  );
}
