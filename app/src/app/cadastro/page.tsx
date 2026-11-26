import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { Topo } from "@/components/ui";
import { SeloAguaPraja } from "@/components/marca";
import { marcaAtual } from "@/lib/marca";
import FormCadastro from "./FormCadastro";
import { cidadesParaEndereco } from "@/lib/cidades";
import { sair } from "../entrar/actions";
import Link from "next/link";
import ExcluirConta from "./ExcluirConta";
import NavCliente from "@/components/NavCliente";

export const metadata: Metadata = { title: "Seus dados" };

export default async function Cadastro() {
  const u = await exigirUsuario();
  const db = await getDb();
  const marca = await marcaAtual();
  const [end] = await db
    .select()
    .from(schema.enderecos)
    .where(and(eq(schema.enderecos.usuarioId, u.id), eq(schema.enderecos.padrao, true)))
    .limit(1);

  // Cliente já cadastrado: a Conta é uma aba do menu (no primeiro cadastro, não, porque é um passo obrigatório).
  const comMenu = !!end && u.papel === "cliente";
  return (
    <div className={comMenu ? "com-menu" : undefined}>
      <Topo titulo="Seus dados" subtitulo="Para a distribuidora saber onde entregar" voltar={end ? "/inicio" : undefined}
        acao={
          <form action={sair}>
            <button className="link-texto">Sair</button>
          </form>
        }
      />
      <main className="conteudo">
        <FormCadastro nome={u.nome ?? ""} endereco={end ?? null} jaAceitou={!!u.aceitouTermosEm} cidades={await cidadesParaEndereco()} />
        {end && (
          <nav className="cartao divide-y divide-borda py-1" aria-label="Mais opções da conta">
            <Link href="/avisos" className="flex min-h-12 items-center justify-between text-[15px] font-semibold">
              Avisos e notificações <span aria-hidden="true">›</span>
            </Link>
            {u.papel === "cliente" && !marca && (
              <Link href="/loja/cadastro" className="flex min-h-12 items-center justify-between text-[15px] font-semibold">
                Tenho uma distribuidora: cadastrar minha loja <span aria-hidden="true">›</span>
              </Link>
            )}
            <Link href="/termos" className="flex min-h-12 items-center justify-between text-[15px] font-semibold">
              Termos de uso e privacidade <span aria-hidden="true">›</span>
            </Link>
          </nav>
        )}
        {end && u.papel === "cliente" && <ExcluirConta />}
      </main>
      {marca && <SeloAguaPraja comFolgaDoMenu={comMenu} />}
      {comMenu && <NavCliente />}
    </div>
  );
}
