import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirLoja } from "@/lib/loja";
import { conectarSimulado, contaDaLoja, desconectar, modoPagamento, taxaPlataforma, urlConectar } from "@/lib/mercadopago";
import { urlBase } from "@/lib/url";
import { Topo } from "@/components/ui";
import { chaveLegivel } from "@/lib/pix";
import FormPix from "./FormPix";

export const metadata: Metadata = { title: "Pagamentos" };

async function conectar() {
  "use server";
  const { loja } = await exigirLoja();
  if (modoPagamento() === "simulado") {
    await conectarSimulado(loja.id);
    revalidatePath("/loja/pagamentos");
    return;
  }
  if (modoPagamento() !== "real") return;
  redirect(urlConectar(loja.id, await urlBase()));
}

async function desligar() {
  "use server";
  const { loja } = await exigirLoja();
  await desconectar(loja.id);
  revalidatePath("/loja/pagamentos");
}

export default async function Pagamentos({ searchParams }: PageProps<"/loja/pagamentos">) {
  const { loja } = await exigirLoja();
  const sp = await searchParams;
  const modo = modoPagamento();
  const conta = await contaDaLoja(loja.id);
  const conectada = !!conta && (conta.mpUserId === "simulado") === (modo === "simulado");
  const exemplo = taxaPlataforma(10000);

  return (
    <>
      <Topo titulo="Pagamentos" subtitulo={loja.nome} voltar="/loja/ajustes" />
      <main className="conteudo">
        <section className="cartao-elevado pilha">
          <div className="flex items-center justify-between gap-2">
            <h2 className="titulo-secao">Pix da loja</h2>
            <span className={`selo ${loja.pixChave ? "selo-verde" : "selo-terra"}`}>{loja.pixChave ? "Cadastrado" : "Sem chave"}</span>
          </div>
          <p className="text-sm text-tinta-suave">
            Quando o cliente escolhe <b>Pix</b> para pagar na entrega ou na retirada, ele vê esta chave e o <b>Pix copia e cola</b> já com o valor do pedido. O dinheiro
            cai direto na sua conta, sem taxa do ÁguaPrajá.
          </p>
          <FormPix
            tipo={loja.pixTipo}
            chaveLegivel={loja.pixChave && loja.pixTipo ? chaveLegivel(loja.pixTipo, loja.pixChave) : null}
            nome={loja.pixNome}
            nomeLoja={loja.nome}
          />
        </section>

        {sp.ok && <p className="aviso-ok">Conta Mercado Pago conectada! Seus clientes já podem pagar pelo app.</p>}
        {sp.erro && <p className="aviso-erro">Não deu para conectar a conta. Tente de novo.</p>}

        <section className="cartao-elevado pilha">
          <div className="flex items-center justify-between gap-2">
            <h2 className="titulo-secao">Mercado Pago</h2>
            <span className={`selo ${conectada ? "selo-verde" : "selo-terra"}`}>{conectada ? "Conectado" : "Não conectado"}</span>
          </div>
          <p className="text-sm">
            Com o Mercado Pago conectado, o cliente pode pagar <b>na hora do pedido, com Pix ou cartão</b>. O dinheiro cai direto na <b>sua conta</b> do Mercado Pago — o
            ÁguaPrajá não segura o seu dinheiro.
          </p>
          <ul className="list-disc pl-5 text-sm text-tinta-suave">
            <li>O pedido fica marcado como “Pago” sozinho quando o pagamento é aprovado, e você recebe um aviso.</li>
            <li>Se você ou o cliente cancelar um pedido pago, o valor volta automaticamente para o cliente.</li>
            <li>O cliente continua podendo escolher pagar na entrega.</li>
            <li>As tarifas do Mercado Pago (Pix e cartão) são as da sua conta.{exemplo > 0 ? ` A taxa do ÁguaPrajá é de ${(exemplo / 100).toLocaleString("pt-BR")}% por venda paga pelo app.` : ""}</li>
          </ul>
          {conectada ? (
            <>
              <p className="text-sm text-tinta-suave">
                Conectado em {conta!.conectadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Belem" })}
                {conta!.mpUserId !== "simulado" ? ` · conta ${conta!.mpUserId}` : " · conta de teste"}.
              </p>
              <form action={desligar}>
                <button className="botao-peq-perigo w-full">Desconectar (clientes voltam a pagar só na entrega)</button>
              </form>
            </>
          ) : modo === "desligado" ? (
            <p className="aviso-info text-sm">O pagamento pelo app está sendo ativado pelo ÁguaPrajá. Em breve você poderá conectar sua conta aqui.</p>
          ) : (
            <form action={conectar}>
              <button className="botao w-full">{modo === "simulado" ? "Conectar conta de teste" : "Conectar minha conta Mercado Pago"}</button>
              {modo === "simulado" && <p className="mt-2 text-xs text-tinta-suave">Modo de teste: nenhum dinheiro de verdade é cobrado.</p>}
            </form>
          )}
        </section>
        <p className="text-xs text-tinta-suave">Não tem conta? Crie grátis em mercadopago.com.br com o CPF ou CNPJ da loja e depois volte aqui.</p>
      </main>
    </>
  );
}
