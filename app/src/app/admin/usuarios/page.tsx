import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Topo, Vazio } from "@/components/ui";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import LinkSenha from "../LinkSenha";

export const metadata: Metadata = { title: "Usuários" };

const PAPEIS = [
  ["todos", "Todos"],
  ["cliente", "Clientes"],
  ["loja", "Lojas"],
  ["entregador", "Entregadores"],
  ["admin", "Admins"],
] as const;
type Papel = "cliente" | "loja" | "entregador" | "admin";

export default async function Usuarios({ searchParams }: PageProps<"/admin/usuarios">) {
  const sp = await searchParams;
  const papel = PAPEIS.some(([k]) => k === sp.papel) ? (sp.papel as string) : "todos";
  const busca = typeof sp.q === "string" ? sp.q.trim() : "";
  const db = await getDb();

  const filtros: SQL[] = [];
  if (papel !== "todos") filtros.push(eq(schema.usuarios.papel, papel as Papel));
  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    const cond = or(ilike(schema.usuarios.nome, `%${busca}%`), ...(digitos.length >= 3 ? [ilike(schema.usuarios.telefone, `%${digitos}%`)] : []));
    if (cond) filtros.push(cond);
  }
  const usuarios = await db
    .select({
      id: schema.usuarios.id,
      nome: schema.usuarios.nome,
      telefone: schema.usuarios.telefone,
      papel: schema.usuarios.papel,
      temSenha: schema.usuarios.senhaHash,
      criadoEm: schema.usuarios.criadoEm,
    })
    .from(schema.usuarios)
    .where(filtros.length ? and(...filtros) : undefined)
    .orderBy(desc(schema.usuarios.criadoEm))
    .limit(100);

  return (
    <>
      <Topo titulo="Usuários" subtitulo="Clientes, lojas, entregadores e admins" voltar="/admin" />
      <main className="conteudo">
        <LinkSenha />
        <form className="flex gap-2">
          {papel !== "todos" && <input type="hidden" name="papel" value={papel} />}
          <input className="entrada min-h-11 flex-1" name="q" defaultValue={busca} placeholder="Buscar por nome ou celular" />
          <button className="botao-peq-sec">Buscar</button>
        </form>
        <nav className="flex gap-2 overflow-x-auto" aria-label="Filtro">
          {PAPEIS.map(([k, rot]) => (
            <Link key={k} href={k === "todos" ? "/admin/usuarios" : `/admin/usuarios?papel=${k}`} className={papel === k ? "botao-peq" : "botao-peq-sec"}>
              {rot}
            </Link>
          ))}
        </nav>
        {usuarios.length === 0 ? (
          <Vazio>Ninguém encontrado.</Vazio>
        ) : (
          <ul className="cartao divide-y divide-borda py-1">
            {usuarios.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <b className="block truncate">{u.nome ?? "Sem nome"}</b>
                  <a className="text-verde underline" href={linkWhatsApp(u.telefone)} target="_blank" rel="noopener noreferrer">
                    {formatarTelefone(u.telefone)}
                  </a>
                  <span className="text-tinta-suave"> · desde {u.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Belem" })}</span>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                  <span className="selo selo-cinza">{u.papel}</span>
                  {!u.temSenha && <span className="text-xs text-tinta-suave">sem senha</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {usuarios.length === 100 && <p className="text-xs text-tinta-suave">Mostrando os 100 mais recentes. Use a busca para achar alguém.</p>}
      </main>
    </>
  );
}
