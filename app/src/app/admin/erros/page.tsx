import type { Metadata } from "next";
import { Topo, Vazio } from "@/components/ui";
import { errosAgrupados } from "@/lib/erros";

export const metadata: Metadata = { title: "Erros do servidor" };

const quando = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

const TIPO: Record<string, string> = { render: "tela", action: "botão/formulário", route: "rota", proxy: "proxy" };

export default async function Erros() {
  const lista = await errosAgrupados();
  return (
    <>
      <Topo titulo="Erros do servidor" subtitulo="Últimos 30 dias, agrupados" voltar="/admin" />
      <main className="conteudo">
        <p className="text-sm text-tinta-suave">
          Quando algo quebra numa tela ou num botão, aparece aqui. Mande o código do erro para quem cuida do app: ele aponta o registro completo no log da Vercel.
        </p>
        {lista.length === 0 && <Vazio>Nenhum erro registrado. 🎉</Vazio>}
        {lista.map((e, i) => (
          <article key={i} className="cartao pilha">
            <div className="flex items-baseline justify-between gap-2">
              <b className="break-all text-[15px]">{e.rota}</b>
              <span className="flex-none text-xs text-tinta-suave">{quando(e.ultimo)}</span>
            </div>
            <p className="break-words text-sm">{e.mensagem}</p>
            <p className="text-xs text-tinta-suave">
              {e.vezes} {e.vezes === 1 ? "vez" : "vezes"}
              {e.tipo ? ` · ${TIPO[e.tipo] ?? e.tipo}` : ""}
              {e.digest ? ` · código ${e.digest}` : ""}
            </p>
          </article>
        ))}
      </main>
    </>
  );
}
