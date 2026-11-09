import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { Topo } from "@/components/ui";
import FormCadastro from "./FormCadastro";

export const metadata: Metadata = { title: "Seus dados" };

export default async function Cadastro() {
  const u = await exigirUsuario();
  const db = await getDb();
  const [end] = await db
    .select()
    .from(schema.enderecos)
    .where(and(eq(schema.enderecos.usuarioId, u.id), eq(schema.enderecos.padrao, true)))
    .limit(1);

  return (
    <>
      <Topo titulo="Seus dados" subtitulo="Para a distribuidora saber onde entregar" voltar={end ? "/inicio" : undefined} />
      <main className="conteudo">
        <FormCadastro nome={u.nome ?? ""} endereco={end ?? null} jaAceitou={!!u.aceitouTermosEm} />
      </main>
    </>
  );
}
