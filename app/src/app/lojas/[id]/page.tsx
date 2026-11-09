import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { descontoPercentual, planoSugerido } from "@/lib/lojas-proximas";
import { frequenciaTexto, simular } from "@/lib/simulador";
import { distanciaKm, formatarKm } from "@/lib/geo";
import { CATEGORIAS, ORDEM_GRUPOS, podeVender } from "@/lib/catalogo";
import { formatarReais } from "@/lib/validacao";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Distribuidora" };

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Loja({ params }: PageProps<"/lojas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { usuario, endereco, db } = await exigirCliente();
  const [loja] = await db
    .select()
    .from(schema.lojas)
    .where(and(eq(schema.lojas.id, id), eq(schema.lojas.status, "aprovada")))
    .limit(1);
  if (!loja) notFound();

  const [planos, produtos] = await Promise.all([
    db.select().from(schema.planos).where(and(eq(schema.planos.lojaId, loja.id), eq(schema.planos.ativo, true))).orderBy(asc(schema.planos.galoesMes)),
    db.select().from(schema.produtos).where(eq(schema.produtos.lojaId, loja.id)).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome)),
  ]);
  const aVenda = produtos.filter(podeVender);
  const galao = aVenda.find((p) => p.categoria === "agua_galao");
  const r = usuario.perfilFamilia ? simular(usuario.perfilFamilia, usuario.perfilFamilia) : null;
  const sugerido = r ? planoSugerido(planos, r.galoesMes) : null;
  const km = distanciaKm(endereco, loja);
  const entregaAqui = loja.fazEntrega && km <= loja.raioKm;
  const grupos = ORDEM_GRUPOS.map((g) => ({
    grupo: g,
    itens: aVenda.filter((p) => CATEGORIAS[p.categoria].grupo === g && p.categoria !== "agua_galao"),
  })).filter((g) => g.itens.length);
  const regras = loja.regrasHorario;

  return (
    <>
      <Topo titulo={loja.nome} subtitulo={`${loja.bairro} · ${formatarKm(km)}`} voltar="/lojas" />
      <main className="conteudo">
        <section className="cartao pilha">
          <div className="flex flex-wrap gap-1.5">
            {entregaAqui ? (
              <span className="selo selo-verde">{loja.taxaEntregaCentavos ? `Entrega ${formatarReais(loja.taxaEntregaCentavos)}` : "Entrega grátis"}</span>
            ) : (
              loja.fazEntrega && <span className="selo selo-cinza">Não entrega no seu endereço</span>
            )}
            {loja.fazRetirada && <span className="selo selo-rio">Retirada no local</span>}
            {loja.seloFiscalDeclarado && <span className="selo selo-terra">Água com selo fiscal</span>}
          </div>
          <p className="text-sm text-tinta-suave">
            Abre {regras.dias.map((d) => DIAS[d]).join(", ")} · {regras.abre}–{regras.fecha}
            {regras.aceitaImediato && entregaAqui ? ` · entrega “o quanto antes” em até ${regras.prazoImediatoMin} min` : ""}
          </p>
          {galao && (
            <p className="text-sm">
              Galão 20 L avulso: <b>{formatarReais(galao.precoCentavos)}</b>
              {galao.marca ? ` · ${galao.marca}` : ""}
            </p>
          )}
        </section>

        <h2 className="titulo-secao mt-1">Planos mensais</h2>
        {planos.map((p) => {
          const desc = descontoPercentual(p, galao?.precoCentavos ?? null);
          const ehSugerido = sugerido?.id === p.id;
          return (
            <div key={p.id} className={`flex items-center justify-between gap-2 rounded-[18px] bg-white p-3.5 ${ehSugerido ? "border-2 border-acai bg-acai-claro" : "border border-borda2"}`}>
              <div>
                <b className="text-base">{p.galoesMes} galões/mês</b>
                <p className="text-sm text-tinta-suave">
                  {frequenciaTexto(p.galoesMes)}{desc > 0 ? ` · economia de ${desc}%` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <b>{formatarReais(p.precoCentavos)}</b>
                {ehSugerido && <span className="selo bg-acai text-white">Sugerido</span>}
              </div>
            </div>
          );
        })}
        <p className="aviso-info text-sm">Escolher dias, horário e pagar: chega na próxima etapa (pedidos e assinatura).</p>

        {grupos.length > 0 && <h2 className="titulo-secao mt-2">Também vai na entrega</h2>}
        {grupos.map(({ grupo, itens }) => (
          <section key={grupo} className="cartao">
            <h3 className="mb-1 font-bold">{grupo}</h3>
            <ul className="divide-y divide-borda">
              {itens.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{p.nome}</p>
                    <p className="text-sm text-tinta-suave">
                      {p.marca ?? ""}
                      {p.alcoolico && <span className="selo selo-acai ml-1">18+</span>}
                    </p>
                  </div>
                  <b className="flex-none">{formatarReais(p.precoCentavos)}</b>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
