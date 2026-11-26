import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Topo, Vazio } from "@/components/ui";
import { calcularSituacao, listarPlanosApp } from "@/lib/planos-app";
import { agoraLocal } from "@/lib/tempo";
import { formatarReais } from "@/lib/validacao";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { mudarStatusLoja, registrarMensalidade } from "../actions";
import BeneficioLoja from "./BeneficioLoja";
import PlanoDaLoja from "./PlanoDaLoja";

export const metadata: Metadata = { title: "Distribuidoras" };

const ROTULO = { pendente: "Em análise", aprovada: "Aprovada", suspensa: "Suspensa" } as const;
const COR = { pendente: "selo-terra", aprovada: "selo-verde", suspensa: "selo-cinza" } as const;
const FILTROS = [
  ["todas", "Todas"],
  ["pendente", "Em análise"],
  ["aprovada", "Aprovadas"],
  ["suspensa", "Suspensas"],
] as const;
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export default async function Lojas({ searchParams }: PageProps<"/admin/lojas">) {
  const sp = await searchParams;
  const filtro = FILTROS.some(([k]) => k === sp.status) ? (sp.status as string) : "todas";
  const busca = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const ver = typeof sp.ver === "string" ? sp.ver : null;
  const db = await getDb();
  const hoje = agoraLocal().data;

  const [linhas, planosApp, assinantes] = await Promise.all([
    db
      .select({ loja: schema.lojas, dono: { nome: schema.usuarios.nome, telefone: schema.usuarios.telefone } })
      .from(schema.lojas)
      .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.lojas.donoId))
      .orderBy(desc(schema.lojas.criadoEm)),
    listarPlanosApp(),
    db
      .select({ lojaId: schema.assinaturas.lojaId, n: count() })
      .from(schema.assinaturas)
      .where(inArray(schema.assinaturas.status, ["ativa", "pausada"]))
      .groupBy(schema.assinaturas.lojaId),
  ]);
  const nAssinantes = new Map(assinantes.map((a) => [a.lojaId, a.n]));
  const lista = linhas.filter(({ loja, dono }) => {
    if (ver) return loja.id === ver;
    if (filtro !== "todas" && loja.status !== filtro) return false;
    if (!busca) return true;
    return [loja.nome, loja.bairro, loja.cidade, loja.documento, loja.telefone, dono.nome ?? ""].some((t) => t.toLowerCase().includes(busca));
  });

  return (
    <>
      <Topo titulo="Distribuidoras" subtitulo={`${linhas.length} cadastrada(s)`} voltar={ver ? "/admin/lojas" : "/admin"} />
      <main className="conteudo">
        {!ver && (
          <>
            <form className="flex gap-2">
              {filtro !== "todas" && <input type="hidden" name="status" value={filtro} />}
              <input className="entrada min-h-11 flex-1" name="q" defaultValue={busca} placeholder="Buscar por nome, bairro, CNPJ, telefone" />
              <button className="botao-peq-sec">Buscar</button>
            </form>
            <nav className="flex gap-2 overflow-x-auto" aria-label="Filtro">
              {FILTROS.map(([k, rot]) => (
                <Link key={k} href={k === "todas" ? "/admin/lojas" : `/admin/lojas?status=${k}`} className={filtro === k ? "botao-peq" : "botao-peq-sec"}>
                  {rot}
                </Link>
              ))}
            </nav>
          </>
        )}

        {lista.length === 0 && <Vazio>Nenhuma distribuidora aqui.</Vazio>}
        {lista.map(({ loja, dono }) => {
          const s = calcularSituacao(loja, planosApp, hoje);
          return (
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
                <span className="selo selo-cinza">{nAssinantes.get(loja.id) ?? 0} assinante(s)</span>
              </div>
              <p className="text-sm">
                Responsável: {dono.nome ?? "—"} ·{" "}
                <a className="font-semibold text-verde underline" href={linkWhatsApp(loja.telefone)} target="_blank" rel="noopener noreferrer">
                  {formatarTelefone(loja.telefone)}
                </a>
                {loja.slug && (
                  <>
                    {" · "}
                    <a className="font-semibold text-verde underline" href={`/l/${loja.slug}`} target="_blank" rel="noopener noreferrer">
                      site da loja
                    </a>
                  </>
                )}
              </p>
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
                <input name="observacao" className="entrada min-h-11 flex-1 text-sm" placeholder="Observação (opcional)" maxLength={300} defaultValue={loja.observacaoAdmin ?? ""} />
              </form>

              <div className="pilha border-t border-borda pt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <b>Plano ÁguaPrajá</b>
                  <span className="text-sm">
                    {s.vigente ? s.vigente.nome : planosApp.length ? "Básico" : "Sem planos cadastrados"}
                    {s.vigente && s.vigente.precoCentavos > 0 && s.pagoAte && !s.gratisAte ? ` · pago até ${dataBr(s.pagoAte)}` : ""}
                  </span>
                </div>
                {s.escolhido && s.escolhido.precoCentavos > 0 && (s.gratisAte || s.desconto) && (
                  <p className="text-sm">
                    {s.gratisAte ? (
                      <span className="selo selo-verde">Grátis até {dataBr(s.gratisAte)}</span>
                    ) : (
                      <span className="selo selo-acai">
                        −{s.desconto!.percentual}% · {formatarReais(s.valorCentavos)}/mês{s.desconto!.ate ? ` até ${dataBr(s.desconto!.ate)}` : ""}
                      </span>
                    )}
                  </p>
                )}
                {s.vencido && (
                  <p className="aviso-info text-sm">
                    Escolheu <b>{s.escolhido!.nome}</b> ({formatarReais(s.valorCentavos)}/mês), aguardando pagamento
                    {s.pagoAte ? ` (venceu em ${dataBr(s.pagoAte)})` : ""}.
                  </p>
                )}
                {s.escolhido && s.valorCentavos > 0 && (
                  <form action={registrarMensalidade}>
                    <input type="hidden" name="lojaId" value={loja.id} />
                    <button className="botao-peq w-full">Recebi a mensalidade de {formatarReais(s.valorCentavos)} (+1 mês)</button>
                  </form>
                )}
                <PlanoDaLoja
                  lojaId={loja.id}
                  planoId={loja.planoAppId}
                  pagoAte={loja.planoAppPagoAte}
                  planos={planosApp.map((p) => ({ id: p.id, nome: p.nome, precoCentavos: p.precoCentavos, ativo: p.ativo }))}
                />
                {planosApp.some((p) => p.precoCentavos > 0) && (
                  <BeneficioLoja
                    lojaId={loja.id}
                    precoCentavos={s.escolhido?.precoCentavos ?? null}
                    desconto={loja.descontoMensalidade}
                    descontoAte={loja.descontoAte}
                    gratisAte={loja.gratisAte}
                  />
                )}
              </div>
            </article>
          );
        })}
      </main>
    </>
  );
}
