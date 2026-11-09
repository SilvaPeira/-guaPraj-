import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { Topo } from "@/components/ui";
import FormLoja from "./FormLoja";

export const metadata: Metadata = { title: "Cadastrar distribuidora" };

export default async function CadastroLoja() {
  const u = await exigirUsuario(["cliente", "loja"]);
  const db = await getDb();
  const [loja] = await db.select({ id: schema.lojas.id }).from(schema.lojas).where(eq(schema.lojas.donoId, u.id)).limit(1);
  if (loja) redirect("/loja");

  return (
    <>
      <Topo titulo="Cadastrar distribuidora" subtitulo="Leva uns 3 minutos" voltar="/" />
      <main className="conteudo">
        <FormLoja />
      </main>
    </>
  );
}
