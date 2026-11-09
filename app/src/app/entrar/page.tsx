import { redirect } from "next/navigation";
import FormEntrar from "./FormEntrar";
import { Topo } from "@/components/ui";
import { usuarioAtual } from "@/lib/sessao";
import { destinoDoUsuario } from "@/lib/destino";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const intencao = sp.para === "loja" ? "loja" : null;
  const u = await usuarioAtual();
  if (u) redirect(await destinoDoUsuario(u, intencao));

  return (
    <>
      <Topo titulo={intencao === "loja" ? "Cadastrar minha distribuidora" : "Entrar"} voltar="/" />
      <main className="conteudo">
        <div className="cartao">
          <FormEntrar intencao={intencao} />
        </div>
      </main>
    </>
  );
}
