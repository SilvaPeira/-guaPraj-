import { redirect } from "next/navigation";
import FormEntrar from "./FormEntrar";
import { Topo } from "@/components/ui";
import { usuarioAtual } from "@/lib/sessao";
import { marcaAtual } from "@/lib/marca";
import { LogoLoja, SeloAguaPraja } from "@/components/marca";
import { destinoDoUsuario } from "@/lib/destino";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const intencao = sp.para === "loja" ? "loja" : null;
  const u = await usuarioAtual();
  const marca = await marcaAtual();
  if (u) redirect(await destinoDoUsuario(u, intencao));

  return (
    <>
      <Topo titulo={intencao === "loja" ? "Cadastrar minha distribuidora" : "Entrar"} voltar={marca ? `/l/${marca.slug}` : "/"} />
      <main className="conteudo">
        {marca && (
          <div className="flex justify-center py-2 text-tinta">
            <LogoLoja marca={marca} tamanho={48} />
          </div>
        )}
        <div className="cartao">
          <FormEntrar intencao={intencao} />
        </div>
      </main>
      {marca && <SeloAguaPraja />}
    </>
  );
}
