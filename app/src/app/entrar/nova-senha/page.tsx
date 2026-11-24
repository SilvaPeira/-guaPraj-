import type { Metadata } from "next";
import { Topo } from "@/components/ui";
import FormNovaSenha from "./FormNovaSenha";

export const metadata: Metadata = { title: "Nova senha" };

export default async function NovaSenha({ searchParams }: PageProps<"/entrar/nova-senha">) {
  const sp = await searchParams;
  const tel = typeof sp.tel === "string" ? sp.tel : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  return (
    <>
      <Topo titulo="Criar nova senha" voltar="/entrar" />
      <main className="conteudo">
        <div className="cartao">{tel && token ? <FormNovaSenha telefone={tel} token={token} /> : <p className="aviso-erro">Link incompleto. Peça outro ao suporte.</p>}</div>
      </main>
    </>
  );
}
