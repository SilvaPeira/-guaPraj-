import type { Metadata } from "next";
import { exigirLoja } from "@/lib/loja";
import { cascosEmMaos } from "@/lib/operacao";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { Topo, Vazio } from "@/components/ui";
import { cascoAcao } from "../operacao-actions";

export const metadata: Metadata = { title: "Cascos" };

export default async function Cascos() {
  const { loja, db } = await exigirLoja();
  const lista = (await cascosEmMaos(db, loja.id)).sort((a, b) => b.total - a.total);
  const total = lista.reduce((s, c) => s + c.total, 0);

  return (
    <>
      <Topo titulo="Cascos com clientes" subtitulo={loja.nome} voltar="/loja" />
      <main className="conteudo">
        <p className="aviso-info text-sm">
          Aqui aparecem os vasilhames da loja que ficaram com clientes: quando o entregador recolhe menos cascos do que entregou. A troca 1 por 1 e
          os cascos vendidos não entram na conta.
        </p>
        <div className="cartao">
          <b className="font-titulo text-2xl">{total}</b>
          <span className="ml-2 text-sm text-tinta-suave">casco(s) da loja com clientes</span>
        </div>
        {lista.length === 0 && <Vazio>Nenhum casco pendente. 👍</Vazio>}
        <ul className="pilha">
          {lista.map((c) => (
            <li key={c.clienteId} className="cartao flex flex-wrap items-center justify-between gap-2">
              <div>
                <b>{c.nome ?? "Cliente"}</b>
                <p className="text-sm text-tinta-suave">
                  {c.total > 0 ? `Está com ${c.total} casco(s) da loja` : `Loja deve ${-c.total} casco(s)`} ·{" "}
                  <a className="text-verde underline" href={linkWhatsApp(c.telefone, `Olá! Ficaram ${c.total} casco(s) da nossa loja com você. Podemos recolher na próxima entrega?`)} target="_blank" rel="noopener noreferrer">
                    {formatarTelefone(c.telefone)}
                  </a>
                </p>
              </div>
              <form action={cascoAcao} className="flex gap-2">
                <input type="hidden" name="clienteId" value={c.clienteId} />
                <button name="delta" value="-1" className="botao-peq-sec">
                  Devolveu 1
                </button>
                {c.total > 1 && (
                  <button name="delta" value={String(-c.total)} className="botao-peq">
                    Devolveu todos
                  </button>
                )}
              </form>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
