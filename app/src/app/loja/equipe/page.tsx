import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirLoja } from "@/lib/loja";
import { formatarTelefone } from "@/lib/telefone";
import { Topo, Vazio } from "@/components/ui";
import { removerEntregador } from "../operacao-actions";
import FormEntregador from "./FormEntregador";

export const metadata: Metadata = { title: "Entregadores" };

export default async function Equipe() {
  const { loja, db } = await exigirLoja();
  const equipe = await db
    .select({ id: schema.entregadores.id, nome: schema.usuarios.nome, telefone: schema.usuarios.telefone })
    .from(schema.entregadores)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.entregadores.usuarioId))
    .where(eq(schema.entregadores.lojaId, loja.id));

  return (
    <>
      <Topo titulo="Entregadores" subtitulo={loja.nome} voltar="/loja" />
      <main className="conteudo">
        <p className="aviso-info text-sm">
          O entregador entra no app com o celular dele e vê só as entregas do dia: abre o endereço no mapa e marca “saiu”, “entregue” ou “não
          entregue”.
        </p>
        {equipe.length === 0 && <Vazio>Nenhum entregador cadastrado. Você também pode fazer as entregas pela agenda.</Vazio>}
        <ul className="pilha">
          {equipe.map((e) => (
            <li key={e.id} className="cartao flex items-center justify-between gap-2">
              <div>
                <b>{e.nome}</b>
                <p className="text-sm text-tinta-suave">{formatarTelefone(e.telefone)}</p>
              </div>
              <form action={removerEntregador}>
                <input type="hidden" name="id" value={e.id} />
                <button className="botao-peq-perigo">Remover</button>
              </form>
            </li>
          ))}
        </ul>
        <FormEntregador />
      </main>
    </>
  );
}
