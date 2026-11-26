import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/sessao";
import { avisosDe, chavePublicaPush, marcarLidos } from "@/lib/notificar";
import { Topo, Vazio } from "@/components/ui";
import AtivarAvisos from "@/components/AtivarAvisos";
import NavCliente from "@/components/NavCliente";

export const metadata: Metadata = { title: "Avisos" };

const quando = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);

/** Histórico de avisos (cliente e loja). Abrir a página marca tudo como visto. */
export default async function Avisos() {
  const u = await exigirUsuario(["cliente", "loja", "entregador", "admin"]);
  const lista = await avisosDe(u.id);
  const novos = new Set(lista.filter((a) => !a.lidoEm).map((a) => a.id));
  await marcarLidos(u.id);
  const voltar = u.papel === "loja" ? "/loja" : u.papel === "admin" ? "/admin" : u.papel === "entregador" ? "/entregas" : "/inicio";

  return (
    <div className={u.papel === "cliente" ? "com-menu" : undefined}>
      <Topo titulo="Avisos" subtitulo="Pedidos, pagamentos e lembretes" voltar={voltar} />
      <main className="conteudo">
        <AtivarAvisos chavePublica={chavePublicaPush()} para={u.papel === "loja" ? "loja" : "cliente"} />
        {lista.length === 0 && <Vazio>Nenhum aviso ainda. Quando algo mudar nos seus pedidos, aparece aqui.</Vazio>}
        {lista.length > 0 && (
          <ul className="cartao divide-y divide-borda py-1">
            {lista.map((a) => {
              const corpo = (
                <>
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="text-[15px]">
                      {novos.has(a.id) && <span className="mr-1.5 inline-block size-2 rounded-full bg-terra align-middle" aria-label="novo" />}
                      {a.titulo}
                    </b>
                    <span className="flex-none text-xs text-tinta-suave">{quando(a.criadoEm)}</span>
                  </span>
                  <span className="block text-sm text-tinta-suave">{a.texto}</span>
                </>
              );
              return (
                <li key={a.id} className="py-2.5">
                  {a.link ? (
                    <Link href={a.link} className="block">
                      {corpo}
                    </Link>
                  ) : (
                    corpo
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      {u.papel === "cliente" && <NavCliente />}
    </div>
  );
}
