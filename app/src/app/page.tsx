import Link from "next/link";
import { redirect } from "next/navigation";
import { Hero, Logo } from "@/components/ui";
import { usuarioAtual } from "@/lib/sessao";
import { destinoDoUsuario } from "@/lib/destino";

export default async function Home() {
  const u = await usuarioAtual();
  if (u) redirect(await destinoDoUsuario(u));

  return (
    <>
      <Hero>
        <Logo />
        <h1 className="mt-7 text-[30px] font-bold leading-tight">
          Água na sua porta,
          <br />
          no dia certo.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-hero-texto">
          Assine um plano com a distribuidora do seu bairro em Canaã dos Carajás e nunca mais fique sem galão.
          Bebidas e gelo vão na mesma entrega.
        </p>
      </Hero>
      <main className="conteudo -mt-10">
        <div className="cartao-elevado flex flex-col gap-4">
          <Beneficio cor="text-rio" titulo="Calcule o consumo da sua família" texto="Informe quem mora na casa e veja quantos galões vocês precisam." />
          <Beneficio cor="text-verde" titulo="Escolha o dia e o horário" texto="Receba toda semana sem precisar pedir no WhatsApp." />
          <Beneficio cor="text-terra" titulo="Só lojas verificadas" texto="Água com selo fiscal do Pará e vasilhame dentro da validade." />
        </div>
        <Link href="/entrar" className="botao mt-2">
          Começar
        </Link>
        <Link href="/entrar?para=loja" className="botao-sec">
          Sou distribuidora
        </Link>
      </main>
    </>
  );
}

function Beneficio({ cor, titulo, texto }: { cor: string; titulo: string; texto: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-fundo ${cor}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div>
        <b className="text-[15px]">{titulo}</b>
        <p className="text-sm leading-snug text-tinta-suave">{texto}</p>
      </div>
    </div>
  );
}
