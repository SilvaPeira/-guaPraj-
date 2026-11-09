import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { Hero, Logo } from "@/components/ui";
import { sair } from "../entrar/actions";

export const metadata: Metadata = { title: "Início" };

export default async function Inicio() {
  const u = await exigirUsuario(["cliente"]);
  const db = await getDb();
  const [end] = await db
    .select()
    .from(schema.enderecos)
    .where(and(eq(schema.enderecos.usuarioId, u.id), eq(schema.enderecos.padrao, true)))
    .limit(1);
  if (!u.nome || !end) redirect("/cadastro");

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
          {end.cidade}, PA · {end.bairro}
        </p>
        <h1 className="text-[26px] font-bold">Olá, {u.nome.split(" ")[0]}!</h1>
      </Hero>
      <main className="conteudo -mt-10">
        <div className="cartao-elevado pilha">
          <b className="font-titulo text-lg">Você ainda não tem um plano</b>
          <p className="text-sm text-tinta-suave">Calcule o consumo da família e escolha uma distribuidora do seu bairro.</p>
          <span className="selo selo-cinza self-start">Planos e pedidos: próxima etapa</span>
        </div>
        <div className="cartao pilha">
          <div className="flex items-center justify-between gap-2">
            <b>Endereço de entrega</b>
            <Link href="/cadastro" className="link-texto">
              Alterar
            </Link>
          </div>
          <p className="text-sm text-tinta-suave">
            {end.logradouro}
            {end.numero ? `, ${end.numero}` : ""}
            {end.complemento ? ` · ${end.complemento}` : ""} — {end.bairro}
            {end.referencia ? <><br />Ref.: {end.referencia}</> : null}
          </p>
        </div>
      </main>
    </>
  );
}
