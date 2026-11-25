import type { Metadata } from "next";
import Link from "next/link";
import { Topo } from "@/components/ui";
import { errosRecentes } from "@/lib/erros";

export const metadata: Metadata = { title: "Ajustes do app" };

export default async function AjustesAdmin() {
  const erros = await errosRecentes(24);
  const itens = [
    { href: "/admin/cidades", titulo: "Cidades atendidas", texto: "Onde clientes e distribuidoras podem se cadastrar" },
    { href: "/admin/categorias", titulo: "Categorias do catálogo", texto: "Gelo, polpas, cervejas… como os produtos aparecem para o cliente" },
    { href: "/admin/erros", titulo: "Erros do servidor", texto: erros ? `${erros} nas últimas 24 h` : "Nenhum nas últimas 24 h" },
  ];
  return (
    <>
      <Topo titulo="Ajustes do app" voltar="/admin" />
      <main className="conteudo">
        <nav className="cartao divide-y divide-borda py-1" aria-label="Ajustes do app">
          {itens.map((i) => (
            <Link key={i.href} href={i.href} className="flex min-h-14 items-center justify-between gap-2 py-2">
              <span>
                <b className="block text-[15px]">{i.titulo}</b>
                <span className="text-sm text-tinta-suave">{i.texto}</span>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
