import type { Metadata } from "next";
import { count, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { Hero, Logo, Vazio } from "@/components/ui";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { mudarStatusLoja } from "./actions";
import { sair } from "../entrar/actions";

export const metadata: Metadata = { title: "Admin" };

const ROTULO = { pendente: "Em análise", aprovada: "Aprovada", suspensa: "Suspensa" } as const;
const COR = { pendente: "selo-terra", aprovada: "selo-verde", suspensa: "selo-cinza" } as const;

export default async function Admin() {
  await exigirUsuario(["admin"]);
  const db = await getDb();
  const lojas = await db
    .select({ loja: schema.lojas, dono: schema.usuarios })
    .from(schema.lojas)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.lojas.donoId))
    .orderBy(desc(schema.lojas.criadoEm));
  const [{ clientes }] = await db.select({ clientes: count() }).from(schema.usuarios).where(eq(schema.usuarios.papel, "cliente"));
  const pendentes = lojas.filter((l) => l.loja.status === "pendente").length;
  const aprovadas = lojas.filter((l) => l.loja.status === "aprovada").length;

  return (
    <>
      <Hero>
        <div className="flex items-center justify-between">
          <Logo />
          <form action={sair}>
            <button className="min-h-11 text-sm font-semibold text-hero-texto underline">Sair</button>
          </form>
        </div>
        <h1 className="mt-5 text-[26px] font-bold">Painel do ÁguaPrajá</h1>
      </Hero>
      <main className="conteudo -mt-10">
        <div className="grid grid-cols-3 gap-2">
          <Kpi valor={pendentes} rotulo="em análise" />
          <Kpi valor={aprovadas} rotulo="lojas ativas" />
          <Kpi valor={clientes} rotulo="clientes" />
        </div>

        <h2 className="titulo-secao mt-2">Distribuidoras</h2>
        {lojas.length === 0 && <Vazio>Nenhuma distribuidora cadastrada ainda.</Vazio>}
        {lojas.map(({ loja, dono }) => (
          <article key={loja.id} className="cartao pilha">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[17px] font-bold">{loja.nome}</h3>
                <p className="text-sm text-tinta-suave">
                  {loja.bairro}, {loja.cidade} · doc. {loja.documento}
                </p>
              </div>
              <span className={`selo ${COR[loja.status]}`}>{ROTULO[loja.status]}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {loja.fazEntrega && <span className="selo selo-verde">Entrega até {loja.raioKm} km</span>}
              {loja.fazRetirada && <span className="selo selo-rio">Retirada</span>}
              {loja.vendeAlcool && <span className="selo selo-acai">Vende álcool (18+)</span>}
              {loja.seloFiscalDeclarado && <span className="selo selo-terra">Declarou selo fiscal</span>}
            </div>
            <p className="text-sm">
              Responsável: {dono.nome ?? "—"} ·{" "}
              <a className="font-semibold text-verde underline" href={linkWhatsApp(loja.telefone)} target="_blank" rel="noopener noreferrer">
                {formatarTelefone(loja.telefone)}
              </a>
            </p>
            {loja.observacaoAdmin && <p className="text-sm text-tinta-suave">Obs.: {loja.observacaoAdmin}</p>}
            <form action={mudarStatusLoja} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={loja.id} />
              {loja.status !== "aprovada" && (
                <button name="status" value="aprovada" className="botao-peq">
                  Aprovar
                </button>
              )}
              {loja.status !== "suspensa" && (
                <button name="status" value="suspensa" className="botao-peq-perigo">
                  Suspender
                </button>
              )}
              <input name="observacao" className="entrada min-h-11 flex-1 text-sm" placeholder="Observação (opcional)" maxLength={300} />
            </form>
          </article>
        ))}
      </main>
    </>
  );
}

function Kpi({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="cartao-elevado p-3">
      <b className="block font-titulo text-[22px]">{valor}</b>
      <span className="text-xs text-tinta-suave">{rotulo}</span>
    </div>
  );
}
