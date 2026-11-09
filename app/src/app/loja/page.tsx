import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { Hero, Logo } from "@/components/ui";
import { formatarReais } from "@/lib/validacao";
import { sair } from "../entrar/actions";

export const metadata: Metadata = { title: "Painel da loja" };

export default async function PainelLoja() {
  const { loja, db } = await exigirLoja();
  const planos = await db.select().from(schema.planos).where(eq(schema.planos.lojaId, loja.id)).orderBy(asc(schema.planos.galoesMes));

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
              Vamos conferir os dados e o selo fiscal da água e te chamar no WhatsApp. Assim que for aprovada, sua loja aparece para os
              clientes do bairro.
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
          <div className="cartao-elevado pilha">
            <span className="selo selo-verde self-start">Loja ativa</span>
            <b className="font-titulo text-lg">Agenda do dia</b>
            <p className="text-sm text-tinta-suave">A agenda de entregas chega na próxima etapa.</p>
          </div>
        )}

        <div className="cartao pilha">
          <b>Seus planos</b>
          <ul className="divide-y divide-borda">
            {planos.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-sm">
                <span>{p.galoesMes} galões/mês</span>
                <b>{formatarReais(p.precoCentavos)}</b>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
